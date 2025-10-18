import express from 'express';
import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import NewsEvent from '../models/NewsEvent.js';
import { AdminPost, Notification, User } from '../models/index.js';
import { runNewsIngestion } from '../jobs/newsIngestion.js';
import logger from '../utils/logger.js';

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
      recentIncidents
    ] = await Promise.all([
      Incident.countDocuments(),
      Incident.countDocuments({ timestamp: { $gte: yesterday } }),
      NewsEvent.countDocuments(),
      Incident.find()
        .sort({ timestamp: -1 })
        .limit(5)
        .select('type description timestamp')
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

    // Simular usuarios (en producción esto vendría de una colección de usuarios)
    const stats = {
      totalIncidents,
      incidentsToday,
      totalUsers: 1, // Usuario admin actual
      guestUsers: 0, // Simulado
      totalNews,
      totalPageViews: Math.floor(Math.random() * 1000) + 500, // Simulado
      incidentsByType: incidentsByTypeObj,
      recentIncidents: recentIncidents.map(incident => ({
        type: incident.type,
        description: incident.description,
        timestamp: incident.timestamp
      })),
      mongoConnected,
      serverUptime: process.uptime(),
      timestamp: new Date()
    };

    res.json(stats);
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas',
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
    console.error('Error creating admin post:', error);
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
    console.error('Error getting admin posts:', error);
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
    console.error('Error updating admin post:', error);
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
    console.error('Error deleting admin post:', error);
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
    console.error('Error triggering news ingestion:', error);
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
    console.error('Error deleting news:', error);
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
    console.error('Error getting news stats:', error);
    res.status(500).json({
      error: 'Error getting news statistics',
      details: error.message
    });
  }
});

export default router;
