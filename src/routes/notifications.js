import express from 'express';
import { Notification, AdminPost } from '../models/index.js';
import { checkJwt, attachUser } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /notifications
 * Get user notifications
 * Query params: unread (boolean), limit, offset
 */
router.get('/', checkJwt, attachUser, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { unread, limit = 50, offset = 0 } = req.query;

    const query = { uid: req.user.uid };

    // Filter by read status
    if (unread === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const unreadCount = await Notification.countDocuments({
      uid: req.user.uid,
      read: false
    });

    res.json({
      notifications,
      unreadCount,
      total: await Notification.countDocuments({ uid: req.user.uid })
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /notifications/:id/read
 * Mark notification as read
 */
router.post('/:id/read', checkJwt, attachUser, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      uid: req.user.uid
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    await notification.markAsRead();

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', checkJwt, attachUser, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await Notification.markAllAsRead(req.user.uid);

    res.json({
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /notifications/admin-posts
 * Get admin posts (announcements)
 */
router.get('/admin-posts', checkJwt, attachUser, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { limit = 20, offset = 0 } = req.query;

    const posts = await AdminPost.find({ published: true })
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Add user-specific data (hasLiked, hasViewed)
    const postsWithUserData = posts.map(post => {
      const postObj = post.toObject();
      return {
        ...postObj,
        hasLiked: post.hasLiked(req.user.uid),
        hasViewed: post.hasViewed(req.user.uid)
      };
    });

    res.json({
      posts: postsWithUserData,
      total: await AdminPost.countDocuments({ published: true })
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /notifications/admin-posts/:id/like
 * Toggle like on admin post
 */
router.post('/admin-posts/:id/like', checkJwt, attachUser, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const post = await AdminPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await post.addLike(req.user.uid);

    logger.info('Admin post like toggled', {
      postId: post._id,
      uid: req.user.uid,
      hasLiked: post.hasLiked(req.user.uid)
    });

    res.json({
      message: 'Like toggled',
      post: {
        id: post._id,
        likeCount: post.likeCount,
        hasLiked: post.hasLiked(req.user.uid)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /notifications/admin-posts/:id/view
 * Mark admin post as viewed
 */
router.post('/admin-posts/:id/view', checkJwt, attachUser, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const post = await AdminPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await post.addView(req.user.uid);

    res.json({
      message: 'View recorded',
      viewCount: post.viewCount
    });
  } catch (error) {
    next(error);
  }
});

export default router;
