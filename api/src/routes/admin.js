import express from 'express';
import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import NewsEvent from '../models/NewsEvent.js';
import { AdminPost, Notification, User, SurlinkListing, Subscription, PaymentHistory, ForumThread, ForumComment, ForumSettings, PricingSettings } from '../models/index.js';
import { runNewsIngestion } from '../jobs/newsIngestion.js';
import logger from '../utils/logger.js';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';

const router = express.Router();

// Middleware para verificar que el usuario es admin
const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado - Se requiere rol de administrador' });
  }

  next();
};

/**
 * GET /admin/stats
 * Obtener estadísticas del sistema
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Fecha de hace 24 horas
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Obtener estadísticas básicas
    const [
      totalIncidents,
      incidentsToday,
      totalNews,
      recentIncidents,
      totalUsers,
      usersToday
    ] = await Promise.all([
      Incident.countDocuments(),
      Incident.countDocuments({ createdAt: { $gte: yesterday } }),
      NewsEvent.countDocuments(),
      Incident.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('type description createdAt'),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: yesterday } })
    ]);

    // Contar incidentes por tipo
    const incidentsByType = await Incident.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const incidentsByTypeObj = {};
    incidentsByType.forEach(item => {
      incidentsByTypeObj[item._id || 'Sin categoría'] = item.count;
    });

    // Estado de las conexiones
    const mongoConnected = mongoose.connection.readyState === 1;

    const stats = {
      totalIncidents,
      incidentsToday,
      totalUsers,
      usersToday,
      totalNews,
      incidentsByType: incidentsByTypeObj,
      recentIncidents: recentIncidents.map(incident => ({
        type: incident.type,
        description: incident.description,
        timestamp: incident.createdAt
      })),
      mongoConnected,
      serverUptime: process.uptime(),
      timestamp: new Date()
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error getting admin stats:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      details: error.message
    });
  }
});

/**
 * GET /admin/users
 * Get user statistics and recent users
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // User counts
    const [
      totalUsers,
      usersToday,
      usersThisWeek,
      usersThisMonth,
      adminUsers,
      regularUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: yesterday } }),
      User.countDocuments({ createdAt: { $gte: lastWeek } }),
      User.countDocuments({ createdAt: { $gte: lastMonth } }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: { $ne: 'admin' } })
    ]);

    // Recent users (last 20)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select('email name role createdAt lastLogin')
      .lean();

    // Users by day (last 7 days)
    const usersByDay = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        const count = await User.countDocuments({
          createdAt: { $gte: date, $lt: nextDate }
        });

        return {
          date: date.toISOString().split('T')[0],
          count
        };
      })
    );

    res.json({
      success: true,
      stats: {
        total: totalUsers,
        today: usersToday,
        thisWeek: usersThisWeek,
        thisMonth: usersThisMonth,
        byRole: {
          admin: adminUsers,
          regular: regularUsers
        }
      },
      recentUsers,
      usersByDay: usersByDay.reverse()
    });
  } catch (error) {
    logger.error('Error getting user stats:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas de usuarios',
      details: error.message
    });
  }
});

/**
 * POST /admin/posts
 * Create a new admin post (announcement)
 */
router.post('/posts', requireAdmin, async (req, res) => {
  try {
    const { title, content, priority } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const post = new AdminPost({
      title,
      content,
      priority: priority || 'normal',
      authorUid: req.session.user.uid || 'admin'
    });

    await post.save();

    // Create notifications for all users
    const users = await User.find({ role: { $ne: 'admin' } });

    const notificationPromises = users.map(user =>
      Notification.createNotification(
        user.uid,
        'admin_post',
        `📢 ${title}`,
        content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        { postId: post._id, priority: post.priority }
      )
    );

    await Promise.all(notificationPromises);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('admin-post', {
        id: post._id,
        title: post.title,
        priority: post.priority
      });
    }

    logger.info('Admin post created', {
      postId: post._id,
      authorUid: req.session.user.uid,
      usersNotified: users.length
    });

    res.status(201).json({
      message: 'Post created successfully',
      post,
      usersNotified: users.length
    });
  } catch (error) {
    logger.error('Error creating admin post:', error);
    res.status(500).json({
      error: 'Error creating post',
      details: error.message
    });
  }
});

/**
 * GET /admin/posts
 * Get all admin posts (including unpublished)
 */
router.get('/posts', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const posts = await AdminPost.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await AdminPost.countDocuments();

    res.json({
      posts,
      total
    });
  } catch (error) {
    logger.error('Error getting admin posts:', error);
    res.status(500).json({
      error: 'Error getting posts',
      details: error.message
    });
  }
});

/**
 * PATCH /admin/posts/:id
 * Update admin post
 */
router.patch('/posts/:id', requireAdmin, async (req, res) => {
  try {
    const { title, content, priority, published } = req.body;

    const post = await AdminPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (priority !== undefined) post.priority = priority;
    if (published !== undefined) post.published = published;

    await post.save();

    logger.info('Admin post updated', {
      postId: post._id,
      updatedBy: req.session.user.uid
    });

    res.json({
      message: 'Post updated successfully',
      post
    });
  } catch (error) {
    logger.error('Error updating admin post:', error);
    res.status(500).json({
      error: 'Error updating post',
      details: error.message
    });
  }
});

/**
 * DELETE /admin/posts/:id
 * Delete admin post
 */
router.delete('/posts/:id', requireAdmin, async (req, res) => {
  try {
    const post = await AdminPost.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    logger.info('Admin post deleted', {
      postId: post._id,
      deletedBy: req.session.user.uid
    });

    res.json({
      message: 'Post deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting admin post:', error);
    res.status(500).json({
      error: 'Error deleting post',
      details: error.message
    });
  }
});

/**
 * POST /admin/news/ingest
 * Manually trigger news ingestion from RSS feeds
 * Automatically filters articles by security keywords from .env
 */
router.post('/news/ingest', requireAdmin, async (req, res) => {
  try {
    const securityKeywords = process.env.NEWS_SECURITY_KEYWORDS
      ? process.env.NEWS_SECURITY_KEYWORDS.split(',').map(k => k.trim()).slice(0, 5)
      : [];

    logger.info('Manual news ingestion triggered', {
      triggeredBy: req.session.user.uid,
      securityFilterEnabled: securityKeywords.length > 0
    });

    // Run news ingestion in background (always with security keywords filter)
    const io = req.app.get('io');
    runNewsIngestion(io).then(result => {
      logger.info('Manual news ingestion completed', result);
    }).catch(error => {
      logger.error('Manual news ingestion failed:', error);
    });

    res.json({
      message: 'News ingestion started (filtering by security keywords)',
      securityKeywordsPreview: securityKeywords.length > 0
        ? `${securityKeywords.join(', ')}...`
        : 'No keywords configured',
      note: 'This process runs in the background and may take several minutes'
    });
  } catch (error) {
    logger.error('Error triggering news ingestion:', error);
    res.status(500).json({
      error: 'Error triggering news ingestion',
      details: error.message
    });
  }
});

/**
 * DELETE /admin/news/clear
 * Delete all news events from the database
 */
router.delete('/news/clear', requireAdmin, async (req, res) => {
  try {
    logger.warn('Mass news deletion triggered', {
      triggeredBy: req.session.user.uid
    });

    const result = await NewsEvent.deleteMany({});

    logger.info('News deletion completed', {
      deletedCount: result.deletedCount,
      deletedBy: req.session.user.uid
    });

    res.json({
      message: 'All news deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error('Error deleting news:', error);
    res.status(500).json({
      error: 'Error deleting news',
      details: error.message
    });
  }
});

/**
 * GET /admin/news/stats
 * Get news ingestion statistics
 * Query params: from, to (date range)
 */
router.get('/news/stats', requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;

    // Build date filter
    const dateFilter = {};
    if (from || to) {
      dateFilter['metadata.fetchedAt'] = {};
      if (from) dateFilter['metadata.fetchedAt'].$gte = new Date(from);
      if (to) dateFilter['metadata.fetchedAt'].$lte = new Date(to);
    }

    // Get total news count
    const totalNews = await NewsEvent.countDocuments({ ...dateFilter, hidden: false });

    // Get news by source
    const newsBySource = await NewsEvent.aggregate([
      { $match: { ...dateFilter, hidden: false } },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get news by category
    const newsByCategory = await NewsEvent.aggregate([
      { $match: { ...dateFilter, hidden: false } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get recent news (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentNews = await NewsEvent.countDocuments({
      'metadata.fetchedAt': { $gte: last24Hours },
      hidden: false
    });

    // Get processing time statistics
    const processingStats = await NewsEvent.aggregate([
      { $match: { ...dateFilter, hidden: false, 'metadata.processingTime': { $exists: true } } },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$metadata.processingTime' },
          minProcessingTime: { $min: '$metadata.processingTime' },
          maxProcessingTime: { $max: '$metadata.processingTime' }
        }
      }
    ]);

    // Get latest news
    const latestNews = await NewsEvent.find({ ...dateFilter, hidden: false })
      .sort({ 'metadata.fetchedAt': -1 })
      .limit(10)
      .select('title source category date metadata.fetchedAt confidence');

    // Get average confidence
    const avgConfidence = await NewsEvent.aggregate([
      { $match: { ...dateFilter, hidden: false } },
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidence' }
        }
      }
    ]);

    // Get news count over time (by day for last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newsOverTime = await NewsEvent.aggregate([
      {
        $match: {
          'metadata.fetchedAt': { $gte: thirtyDaysAgo },
          hidden: false
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$metadata.fetchedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get top locations
    const topLocations = await NewsEvent.aggregate([
      { $match: { ...dateFilter, hidden: false, locationName: { $exists: true } } },
      {
        $group: {
          _id: '$locationName',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const stats = {
      summary: {
        totalNews,
        recentNews24h: recentNews,
        avgConfidence: avgConfidence[0]?.avgConfidence || 0,
        dateRange: {
          from: from || 'all time',
          to: to || 'now'
        }
      },
      bySource: newsBySource.map(item => ({
        source: item._id,
        count: item.count,
        avgConfidence: item.avgConfidence
      })),
      byCategory: newsByCategory.map(item => ({
        category: item._id,
        count: item.count
      })),
      processing: {
        avgTimeMs: processingStats[0]?.avgProcessingTime || 0,
        minTimeMs: processingStats[0]?.minProcessingTime || 0,
        maxTimeMs: processingStats[0]?.maxProcessingTime || 0
      },
      topLocations: topLocations.map(item => ({
        location: item._id,
        count: item.count
      })),
      timeline: newsOverTime.map(item => ({
        date: item._id,
        count: item.count
      })),
      latestNews: latestNews.map(news => ({
        id: news._id,
        title: news.title,
        source: news.source,
        category: news.category,
        date: news.date,
        fetchedAt: news.metadata?.fetchedAt,
        confidence: news.confidence
      }))
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error getting news stats:', error);
    res.status(500).json({
      error: 'Error getting news statistics',
      details: error.message
    });
  }
});

/**
 * POST /admin/surlink/schedule
 * Schedule (placeholder) scraping jobs for Surlink categories
 */
router.post('/surlink/schedule', requireAdmin, async (req, res) => {
  try {
    const { category } = req.body || {};
    const allowed = ['casas', 'autos'];

    if (!category || !allowed.includes(category)) {
      return res.status(400).json({ error: 'Categoría inválida para scrapping' });
    }

    const scheduledAt = new Date();

    logger.info('Surlink scraping scheduled', {
      category,
      scheduledAt,
      requestedBy: req.session.user?.uid
    });

    res.json({
      message: `Scrapping de ${category === 'casas' ? 'Surlink Casas' : 'Surlink Autos'} programado correctamente.`,
      scheduledAt
    });
  } catch (error) {
    logger.error('Error scheduling Surlink scraping', { error });
    res.status(500).json({ error: 'No se pudo programar el scrapping' });
  }
});

/**
 * POST /admin/surlink/cleanup
 * Archive expired or stale Surlink listings
 */
router.post('/surlink/cleanup', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const staleDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000); // 180 días

    const result = await SurlinkListing.updateMany(
      {
        status: 'active',
        $or: [
          { expiresAt: { $lt: now } },
          { createdAt: { $lt: staleDate }, expiresAt: { $exists: false } }
        ]
      },
      { status: 'inactive' }
    );

    logger.info('Surlink cleanup executed', {
      archived: result.modifiedCount || 0,
      performedAt: now,
      requestedBy: req.session.user?.uid
    });

    res.json({
      message: 'Limpieza de listados ejecutada correctamente.',
      archived: result.modifiedCount || 0,
      timestamp: now
    });
  } catch (error) {
    logger.error('Error cleaning up Surlink listings', { error });
    res.status(500).json({ error: 'No se pudo depurar los listados' });
  }
});

/**
 * GET /admin/subscriptions/stats
 * Get subscription statistics
 */
router.get('/subscriptions/stats', requireAdmin, async (req, res) => {
  try {
    // Total subscriptions by status
    const totalActive = await Subscription.countDocuments({ status: 'active' });
    const totalExpired = await Subscription.countDocuments({ status: 'expired' });
    const totalCancelled = await Subscription.countDocuments({ status: 'cancelled' });
    const totalTrial = await Subscription.countDocuments({ status: 'trial' });

    // Subscriptions by plan
    const subscriptionsByPlan = await Subscription.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$price.currency', 'USD'] },
                '$price.amount',
                { $divide: ['$price.amount', 44] } // Convert UYU to USD (approximate)
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Subscriptions by type (personal vs business)
    const subscriptionsByType = await Subscription.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly recurring revenue (MRR)
    const mrrData = await Subscription.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalMRR: {
            $sum: {
              $cond: [
                { $eq: ['$billingCycle', 'yearly'] },
                {
                  $divide: [
                    {
                      $cond: [
                        { $eq: ['$price.currency', 'USD'] },
                        '$price.amount',
                        { $divide: ['$price.amount', 44] }
                      ]
                    },
                    12
                  ]
                },
                {
                  $cond: [
                    { $eq: ['$price.currency', 'USD'] },
                    '$price.amount',
                    { $divide: ['$price.amount', 44] }
                  ]
                }
              ]
            }
          }
        }
      }
    ]);

    // New subscriptions last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const newSubscriptionsLast30Days = await Subscription.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Expiring soon (next 7 days)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiringSoon = await Subscription.countDocuments({
      status: 'active',
      endDate: { $lte: sevenDaysFromNow, $gte: new Date() },
      autoRenew: false
    });

    // Recent subscriptions
    const recentSubscriptions = await Subscription.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'email name')
      .select('plan planType status price startDate endDate userId');

    // Churn rate (cancelled in last 30 days)
    const cancelledLast30Days = await Subscription.countDocuments({
      status: 'cancelled',
      updatedAt: { $gte: thirtyDaysAgo }
    });

    // Subscriptions over time (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const subscriptionsOverTime = await Subscription.aggregate([
      {
        $match: {
          createdAt: { $gte: ninetyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const stats = {
      summary: {
        totalActive,
        totalExpired,
        totalCancelled,
        totalTrial,
        newLast30Days: newSubscriptionsLast30Days,
        expiringSoon,
        cancelledLast30Days,
        churnRate: totalActive > 0 ? ((cancelledLast30Days / totalActive) * 100).toFixed(2) : 0
      },
      revenue: {
        mrr: mrrData[0]?.totalMRR || 0,
        arr: (mrrData[0]?.totalMRR || 0) * 12
      },
      byPlan: subscriptionsByPlan.map(item => ({
        plan: item._id,
        count: item.count,
        revenue: item.totalRevenue
      })),
      byType: subscriptionsByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      timeline: subscriptionsOverTime.map(item => ({
        date: item._id,
        count: item.count
      })),
      recentSubscriptions: recentSubscriptions.map(sub => ({
        id: sub._id,
        plan: sub.plan,
        planType: sub.planType,
        status: sub.status,
        price: sub.price,
        startDate: sub.startDate,
        endDate: sub.endDate,
        user: {
          email: sub.userId?.email || 'N/A',
          name: sub.userId?.name || 'N/A'
        }
      }))
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error getting subscription stats:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas de suscripciones',
      details: error.message
    });
  }
});

/**
 * GET /admin/subscriptions
 * Get all subscriptions with filters
 */
router.get('/subscriptions', requireAdmin, async (req, res) => {
  try {
    const { status, plan, planType, limit = 50, offset = 0 } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (plan) filter.plan = plan;
    if (planType) filter.planType = planType;

    const subscriptions = await Subscription.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('userId', 'email name uid');

    const total = await Subscription.countDocuments(filter);

    res.json({
      subscriptions: subscriptions.map(sub => ({
        id: sub._id,
        plan: sub.plan,
        planType: sub.planType,
        status: sub.status,
        billingCycle: sub.billingCycle,
        price: sub.price,
        startDate: sub.startDate,
        endDate: sub.endDate,
        autoRenew: sub.autoRenew,
        user: {
          id: sub.userId?._id,
          email: sub.userId?.email || 'N/A',
          name: sub.userId?.name || 'N/A',
          uid: sub.userId?.uid
        },
        createdAt: sub.createdAt
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Error getting subscriptions:', error);
    res.status(500).json({
      error: 'Error al obtener suscripciones',
      details: error.message
    });
  }
});

/**
 * PATCH /admin/subscriptions/:id
 * Update subscription status or details
 */
router.patch('/subscriptions/:id', requireAdmin, async (req, res) => {
  try {
    const { status, endDate, autoRenew } = req.body;

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    if (status !== undefined) subscription.status = status;
    if (endDate !== undefined) subscription.endDate = new Date(endDate);
    if (autoRenew !== undefined) subscription.autoRenew = autoRenew;

    await subscription.save();

    logger.info('Subscription updated by admin', {
      subscriptionId: subscription._id,
      updatedBy: req.session.user.uid,
      changes: { status, endDate, autoRenew }
    });

    res.json({
      message: 'Suscripción actualizada exitosamente',
      subscription
    });
  } catch (error) {
    logger.error('Error updating subscription:', error);
    res.status(500).json({
      error: 'Error al actualizar suscripción',
      details: error.message
    });
  }
});

/**
 * DELETE /admin/subscriptions/:id
 * Cancel a subscription
 */
router.delete('/subscriptions/:id', requireAdmin, async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    await subscription.cancel();

    logger.info('Subscription cancelled by admin', {
      subscriptionId: subscription._id,
      cancelledBy: req.session.user.uid
    });

    res.json({
      message: 'Suscripción cancelada exitosamente'
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({
      error: 'Error al cancelar suscripción',
      details: error.message
    });
  }
});

/**
 * POST /admin/subscriptions/:id/renew
 * Renew a subscription (extend end date)
 */
router.post('/subscriptions/:id/renew', requireAdmin, async (req, res) => {
  try {
    const { months = 1 } = req.body;

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    await subscription.renew(months);

    logger.info('Subscription renewed by admin', {
      subscriptionId: subscription._id,
      renewedBy: req.session.user.uid,
      months
    });

    res.json({
      message: `Suscripción renovada por ${months} ${months === 1 ? 'mes' : 'meses'}`,
      subscription
    });
  } catch (error) {
    logger.error('Error renewing subscription:', error);
    res.status(500).json({
      error: 'Error al renovar suscripción',
      details: error.message
    });
  }
});

/**
 * GET /admin/subscriptions/export/csv
 * Export subscriptions to CSV
 */
router.get('/subscriptions/export/csv', requireAdmin, async (req, res) => {
  try {
    const { status, plan, planType } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (plan) filter.plan = plan;
    if (planType) filter.planType = planType;

    const subscriptions = await Subscription.find(filter)
      .populate('userId', 'email name uid')
      .sort({ createdAt: -1 });

    // Prepare data for CSV
    const data = subscriptions.map(sub => ({
      ID: sub._id,
      Usuario: sub.userId?.name || 'N/A',
      Email: sub.userId?.email || 'N/A',
      Plan: sub.plan,
      'Tipo de Plan': sub.planType,
      Estado: sub.status,
      'Ciclo de Facturación': sub.billingCycle,
      'Precio': sub.price.amount,
      'Moneda': sub.price.currency,
      'Fecha de Inicio': sub.startDate.toISOString().split('T')[0],
      'Fecha de Vencimiento': sub.endDate.toISOString().split('T')[0],
      'Auto-renovación': sub.autoRenew ? 'Sí' : 'No',
      'Creado': sub.createdAt.toISOString().split('T')[0]
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename=subscriptions.csv');
    res.send(csv);

    logger.info('Subscriptions exported to CSV', {
      exportedBy: req.session.user.uid,
      count: subscriptions.length
    });
  } catch (error) {
    logger.error('Error exporting subscriptions to CSV:', error);
    res.status(500).json({
      error: 'Error al exportar suscripciones',
      details: error.message
    });
  }
});

/**
 * GET /admin/subscriptions/export/excel
 * Export subscriptions to Excel
 */
router.get('/subscriptions/export/excel', requireAdmin, async (req, res) => {
  try {
    const { status, plan, planType } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (plan) filter.plan = plan;
    if (planType) filter.planType = planType;

    const subscriptions = await Subscription.find(filter)
      .populate('userId', 'email name uid')
      .sort({ createdAt: -1 });

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Suscripciones');

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 25 },
      { header: 'Usuario', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Plan', key: 'plan', width: 15 },
      { header: 'Tipo', key: 'planType', width: 15 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Ciclo', key: 'billingCycle', width: 15 },
      { header: 'Precio', key: 'price', width: 12 },
      { header: 'Moneda', key: 'currency', width: 10 },
      { header: 'Inicio', key: 'startDate', width: 15 },
      { header: 'Vencimiento', key: 'endDate', width: 15 },
      { header: 'Auto-renovación', key: 'autoRenew', width: 15 },
      { header: 'Creado', key: 'createdAt', width: 15 }
    ];

    // Add data
    subscriptions.forEach(sub => {
      worksheet.addRow({
        id: sub._id.toString(),
        name: sub.userId?.name || 'N/A',
        email: sub.userId?.email || 'N/A',
        plan: sub.plan,
        planType: sub.planType,
        status: sub.status,
        billingCycle: sub.billingCycle,
        price: sub.price.amount,
        currency: sub.price.currency,
        startDate: sub.startDate.toISOString().split('T')[0],
        endDate: sub.endDate.toISOString().split('T')[0],
        autoRenew: sub.autoRenew ? 'Sí' : 'No',
        createdAt: sub.createdAt.toISOString().split('T')[0]
      });
    });

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1976D2' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=subscriptions.xlsx');

    await workbook.xlsx.write(res);
    res.end();

    logger.info('Subscriptions exported to Excel', {
      exportedBy: req.session.user.uid,
      count: subscriptions.length
    });
  } catch (error) {
    logger.error('Error exporting subscriptions to Excel:', error);
    res.status(500).json({
      error: 'Error al exportar suscripciones',
      details: error.message
    });
  }
});

/**
 * GET /admin/payments
 * Get all payment history
 */
router.get('/payments', requireAdmin, async (req, res) => {
  try {
    const { userId, status, limit = 50, offset = 0 } = req.query;

    // Build filter
    const filter = {};
    if (userId) filter.userId = userId;
    if (status) filter.status = status;

    const payments = await PaymentHistory.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('userId', 'email name uid')
      .populate('subscriptionId', 'plan planType');

    const total = await PaymentHistory.countDocuments(filter);

    res.json({
      payments: payments.map(payment => ({
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        description: payment.description,
        user: {
          id: payment.userId?._id,
          email: payment.userId?.email || 'N/A',
          name: payment.userId?.name || 'N/A'
        },
        subscription: {
          plan: payment.subscriptionId?.plan,
          planType: payment.subscriptionId?.planType
        },
        createdAt: payment.createdAt,
        completedAt: payment.completedAt
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Error getting payment history:', error);
    res.status(500).json({
      error: 'Error al obtener historial de pagos',
      details: error.message
    });
  }
});

/**
 * GET /admin/payments/user/:userId
 * Get payment history for specific user
 */
router.get('/payments/user/:userId', requireAdmin, async (req, res) => {
  try {
    const payments = await PaymentHistory.getUserPaymentHistory(req.params.userId);

    res.json({
      userId: req.params.userId,
      payments: payments.map(payment => ({
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        description: payment.description,
        subscription: {
          plan: payment.subscriptionId?.plan,
          planType: payment.subscriptionId?.planType
        },
        createdAt: payment.createdAt,
        completedAt: payment.completedAt
      })),
      total: payments.length
    });
  } catch (error) {
    logger.error('Error getting user payment history:', error);
    res.status(500).json({
      error: 'Error al obtener historial de pagos del usuario',
      details: error.message
    });
  }
});

/**
 * POST /admin/payments
 * Create a manual payment record
 */
router.post('/payments', requireAdmin, async (req, res) => {
  try {
    const {
      subscriptionId,
      userId,
      amount,
      currency,
      paymentMethod,
      description,
      transactionId
    } = req.body;

    if (!subscriptionId || !userId || !amount) {
      return res.status(400).json({
        error: 'Faltan campos requeridos: subscriptionId, userId, amount'
      });
    }

    const payment = new PaymentHistory({
      subscriptionId,
      userId,
      amount,
      currency: currency || 'USD',
      status: 'completed',
      paymentMethod: paymentMethod || 'manual',
      paymentGateway: 'manual',
      description,
      transactionId,
      completedAt: new Date()
    });

    await payment.save();

    logger.info('Manual payment created', {
      paymentId: payment._id,
      createdBy: req.session.user.uid,
      amount,
      userId
    });

    res.status(201).json({
      message: 'Pago registrado exitosamente',
      payment
    });
  } catch (error) {
    logger.error('Error creating payment:', error);
    res.status(500).json({
      error: 'Error al registrar pago',
      details: error.message
    });
  }
});

/**
 * GET /admin/payments/stats
 * Get payment statistics
 */
router.get('/payments/stats', requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;

    // Get total revenue
    const revenue = await PaymentHistory.getTotalRevenue(from, to);

    // Get payment counts by status
    const paymentsByStatus = await PaymentHistory.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get payment trends (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const paymentTrends = await PaymentHistory.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      revenue,
      byStatus: paymentsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      trends: paymentTrends.map(item => ({
        date: item._id,
        count: item.count,
        total: item.total
      }))
    });
  } catch (error) {
    logger.error('Error getting payment stats:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas de pagos',
      details: error.message
    });
  }
});

/**
 * GET /admin/forum/settings
 * Obtener configuración del foro
 */
router.get('/forum/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await ForumSettings.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    logger.error('Error getting forum settings:', error);
    res.status(500).json({
      error: 'Error al obtener configuración del foro',
      details: error.message
    });
  }
});

/**
 * PUT /admin/forum/settings
 * Actualizar configuración del foro
 */
router.put('/forum/settings', requireAdmin, async (req, res) => {
  try {
    const {
      postCooldownMinutes,
      maxCommentsPerDay,
      allowImages,
      allowLinks,
      maxThreadTitleLength,
      maxThreadContentLength,
      maxCommentLength,
      maxImagesPerPost
    } = req.body;

    const updates = {};
    if (postCooldownMinutes !== undefined) updates.postCooldownMinutes = postCooldownMinutes;
    if (maxCommentsPerDay !== undefined) updates.maxCommentsPerDay = maxCommentsPerDay;
    if (allowImages !== undefined) updates.allowImages = allowImages;
    if (allowLinks !== undefined) updates.allowLinks = allowLinks;
    if (maxThreadTitleLength !== undefined) updates.maxThreadTitleLength = maxThreadTitleLength;
    if (maxThreadContentLength !== undefined) updates.maxThreadContentLength = maxThreadContentLength;
    if (maxCommentLength !== undefined) updates.maxCommentLength = maxCommentLength;
    if (maxImagesPerPost !== undefined) updates.maxImagesPerPost = maxImagesPerPost;

    const settings = await ForumSettings.updateSettings(updates);

    logger.info('Forum settings updated by admin:', { admin: req.session.user.email, updates });

    res.json({
      success: true,
      settings,
      message: 'Configuración del foro actualizada correctamente'
    });
  } catch (error) {
    logger.error('Error updating forum settings:', error);
    res.status(500).json({
      error: 'Error al actualizar configuración del foro',
      details: error.message
    });
  }
});

/**
 * GET /admin/forum/stats
 * Obtener estadísticas del foro
 */
router.get('/forum/stats', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Estadísticas básicas
    const [
      totalThreads,
      totalComments,
      threadsToday,
      threadsThisWeek,
      threadsThisMonth,
      commentsToday,
      commentsThisWeek,
      commentsThisMonth,
      activeThreads,
      deletedThreads,
      totalLikes
    ] = await Promise.all([
      ForumThread.countDocuments(),
      ForumComment.countDocuments(),
      ForumThread.countDocuments({ createdAt: { $gte: yesterday } }),
      ForumThread.countDocuments({ createdAt: { $gte: lastWeek } }),
      ForumThread.countDocuments({ createdAt: { $gte: lastMonth } }),
      ForumComment.countDocuments({ createdAt: { $gte: yesterday } }),
      ForumComment.countDocuments({ createdAt: { $gte: lastWeek } }),
      ForumComment.countDocuments({ createdAt: { $gte: lastMonth } }),
      ForumThread.countDocuments({ status: 'active' }),
      ForumThread.countDocuments({ status: 'deleted' }),
      ForumThread.aggregate([
        { $group: { _id: null, totalLikes: { $sum: '$likesCount' } } }
      ])
    ]);

    // Threads más populares
    const popularThreads = await ForumThread.find({ status: 'active' })
      .sort({ likesCount: -1, commentsCount: -1 })
      .limit(5)
      .populate('author', 'email name')
      .select('title likesCount commentsCount createdAt author')
      .lean();

    // Threads más recientes
    const recentThreads = await ForumThread.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('author', 'email name')
      .select('title likesCount commentsCount createdAt author')
      .lean();

    // Usuarios más activos (por threads creados)
    const topThreadAuthors = await ForumThread.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$author', threadCount: { $sum: 1 } } },
      { $sort: { threadCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: { $ifNull: ['$user.name', '$user.email'] },
          email: '$user.email',
          threadCount: 1
        }
      }
    ]);

    // Usuarios más activos (por comentarios)
    const topCommentAuthors = await ForumComment.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$author', commentCount: { $sum: 1 } } },
      { $sort: { commentCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: { $ifNull: ['$user.name', '$user.email'] },
          email: '$user.email',
          commentCount: 1
        }
      }
    ]);

    // Actividad por día (últimos 7 días)
    const activityByDay = await Promise.all(
      Array.from({ length: 7 }, async (_, i) => {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

        const [threads, comments] = await Promise.all([
          ForumThread.countDocuments({
            createdAt: { $gte: date, $lt: nextDate }
          }),
          ForumComment.countDocuments({
            createdAt: { $gte: date, $lt: nextDate }
          })
        ]);

        return {
          date: date.toISOString().split('T')[0],
          threads,
          comments,
          total: threads + comments
        };
      })
    );

    res.json({
      success: true,
      stats: {
        overview: {
          totalThreads,
          totalComments,
          totalPosts: totalThreads + totalComments,
          activeThreads,
          deletedThreads,
          totalLikes: totalLikes[0]?.totalLikes || 0
        },
        today: {
          threads: threadsToday,
          comments: commentsToday,
          total: threadsToday + commentsToday
        },
        thisWeek: {
          threads: threadsThisWeek,
          comments: commentsThisWeek,
          total: threadsThisWeek + commentsThisWeek
        },
        thisMonth: {
          threads: threadsThisMonth,
          comments: commentsThisMonth,
          total: threadsThisMonth + commentsThisMonth
        },
        popularThreads,
        recentThreads,
        topThreadAuthors,
        topCommentAuthors,
        activityByDay: activityByDay.reverse()
      }
    });
  } catch (error) {
    logger.error('Error getting forum stats:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas del foro',
      details: error.message
    });
  }
});

/**
 * GET /admin/pricing/settings
 * Get pricing configuration
 */
router.get('/pricing/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await PricingSettings.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    logger.error('Error getting pricing settings:', error);
    res.status(500).json({
      error: 'Error al obtener configuración de precios',
      details: error.message
    });
  }
});

/**
 * PUT /admin/pricing/settings
 * Update pricing configuration
 */
router.put('/pricing/settings', requireAdmin, async (req, res) => {
  try {
    const {
      usdToUyu,
      premiumMonthly,
      premiumYearly,
      proMonthly,
      proYearly,
      businessMonthly,
      businessYearly,
      enterpriseMonthly,
      enterpriseYearly,
      whiteLabelMonthly,
      whiteLabelYearly
    } = req.body;

    const updates = {};
    if (usdToUyu !== undefined) updates.usdToUyu = Number(usdToUyu);
    if (premiumMonthly !== undefined) updates.premiumMonthly = Number(premiumMonthly);
    if (premiumYearly !== undefined) updates.premiumYearly = Number(premiumYearly);
    if (proMonthly !== undefined) updates.proMonthly = Number(proMonthly);
    if (proYearly !== undefined) updates.proYearly = Number(proYearly);
    if (businessMonthly !== undefined) updates.businessMonthly = Number(businessMonthly);
    if (businessYearly !== undefined) updates.businessYearly = Number(businessYearly);
    if (enterpriseMonthly !== undefined) updates.enterpriseMonthly = Number(enterpriseMonthly);
    if (enterpriseYearly !== undefined) updates.enterpriseYearly = Number(enterpriseYearly);
    if (whiteLabelMonthly !== undefined) updates.whiteLabelMonthly = Number(whiteLabelMonthly);
    if (whiteLabelYearly !== undefined) updates.whiteLabelYearly = Number(whiteLabelYearly);

    const settings = await PricingSettings.updateSettings(updates);

    logger.info('Pricing settings updated by admin:', { admin: req.session.user.email, updates });

    res.json({
      success: true,
      message: 'Configuración de precios actualizada',
      settings
    });
  } catch (error) {
    logger.error('Error updating pricing settings:', error);
    res.status(500).json({
      error: 'Error al actualizar configuración de precios',
      details: error.message
    });
  }
});

export default router;
