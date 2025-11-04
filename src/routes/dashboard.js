import express from 'express';
import Incident from '../models/Incident.js';
import SurlinkListing from '../models/SurlinkListing.js';
import ForumThread from '../models/ForumThread.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { requireAuth, getAuthenticatedUser } from '../config/auth0.js';

const router = express.Router();

/**
 * Dashboard home page
 * Requires authentication
 */
router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    // Simply render dashboard - authentication is verified by requireAuth middleware
    res.render('dashboard', {
      title: 'Dashboard - Vortex'
    });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    // Pass error to errorHandler middleware
    next(error);
  }
});

/**
 * API endpoint to get dashboard data
 * Returns latest alerts, surlink posts, forum threads, and notifications
 */
router.get('/api/dashboard/data', requireAuth, async (req, res, next) => {
  try {
    // Get authenticated user from either OIDC or Express session
    const authUser = await getAuthenticatedUser(req);

    if (!authUser || !authUser.email) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const userEmail = authUser.email;

    if (!userEmail) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Find user in database
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Get latest incidents (Centinel alerts) - last 10
    const incidents = await Incident.find({
      status: { $in: ['verified', 'pending'] },
      hidden: false
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('type severity location description createdAt neighborhoodName')
      .lean();

    // Get latest Surlink posts - last 10
    const surlinkPosts = await SurlinkListing.find({
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title category price.amount price.currency location.city media createdAt')
      .lean();

    // Get latest forum threads - last 10
    const forumThreads = await ForumThread.find({
      status: 'active'
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('author', 'name picture')
      .select('title hashtags likesCount commentsCount createdAt author')
      .lean();

    // Get user's unread notifications
    const notifications = await Notification.find({
      uid: user.uid,
      read: false
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Count total unread notifications
    const unreadCount = await Notification.countDocuments({
      uid: user.uid,
      read: false
    });

    res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          picture: user.picture,
          reputacion: user.reputacion,
          role: user.role
        },
        incidents: incidents.map(inc => ({
          id: inc._id,
          type: inc.type,
          severity: inc.severity,
          description: inc.description,
          neighborhood: inc.neighborhoodName,
          createdAt: inc.createdAt,
          location: inc.location
        })),
        surlinkPosts: surlinkPosts.map(post => ({
          id: post._id,
          title: post.title,
          category: post.category,
          price: post.price,
          city: post.location?.city,
          image: post.media?.[0] || null,
          createdAt: post.createdAt
        })),
        forumThreads: forumThreads.map(thread => ({
          id: thread._id,
          title: thread.title,
          hashtags: thread.hashtags,
          likesCount: thread.likesCount,
          commentsCount: thread.commentsCount,
          author: thread.author,
          createdAt: thread.createdAt
        })),
        notifications,
        unreadNotificationsCount: unreadCount
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Return detailed error in development, generic in production
    res.status(500).json({
      error: 'Error al cargar los datos del dashboard',
      message: process.env.NODE_ENV === 'production' ? undefined : error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

/**
 * Mark notification as read
 */
router.patch('/api/dashboard/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    const notificationId = req.params.id;

    if (!authUser || !authUser.email) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const user = await User.findOne({ email: authUser.email });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      uid: user.uid
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    await notification.markAsRead();

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Error al marcar la notificación como leída' });
  }
});

/**
 * Mark all notifications as read
 */
router.post('/api/dashboard/notifications/read-all', requireAuth, async (req, res, next) => {
  try {
    const authUser = await getAuthenticatedUser(req);

    if (!authUser || !authUser.email) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const user = await User.findOne({ email: authUser.email });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await Notification.markAllAsRead(user.uid);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Error al marcar todas las notificaciones como leídas' });
  }
});

export default router;
