import express from 'express';
import { generateGuestToken } from '../middleware/auth.js';
import { User, Incident, Validation, ForumThread, ForumComment } from '../models/index.js';
import logger from '../utils/logger.js';
import { getAuthenticatedUser } from '../config/auth0.js';

const router = express.Router();

/**
 * POST /auth/guest-token
 * Generate a guest JWT for anonymous users (read-only access)
 */
router.post('/guest-token', (req, res) => {
  try {
    const token = generateGuestToken();
    res.json({
      token,
      type: 'guest',
      expiresIn: 86400, // 24 hours in seconds
      permissions: []
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate guest token' });
  }
});

// Ruta de callback eliminada - Auth0 maneja /callback automáticamente

/**
 * GET /auth/profile
 * Obtener datos del perfil del usuario actual
 */
router.get('/profile', async (req, res) => {
  try {
    const sessionUser = await getAuthenticatedUser(req);

    if (!sessionUser) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Get user from database with real stats
    const user = await User.findOne({ uid: sessionUser.uid });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const [
      recentIncidents,
      recentValidations,
      forumThreadsCount,
      forumCommentsCount,
      forumThreadStats,
      forumCommentLikes,
      recentForumThreads,
      recentForumComments
    ] = await Promise.all([
      Incident.find({
        reporterUid: user.uid
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('type createdAt'),
      Validation.find({
        uid: user.uid
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('vote createdAt incidentId'),
      ForumThread.countDocuments({ author: user._id, status: 'active' }),
      ForumComment.countDocuments({ author: user._id, status: 'active' }),
      ForumThread.aggregate([
        { $match: { author: user._id, status: 'active' } },
        {
          $group: {
            _id: null,
            totalLikes: { $sum: '$likesCount' },
            totalComments: { $sum: '$commentsCount' }
          }
        }
      ]),
      ForumComment.aggregate([
        { $match: { author: user._id, status: 'active' } },
        {
          $group: {
            _id: null,
            totalLikes: { $sum: '$likesCount' }
          }
        }
      ]),
      ForumThread.find({
        author: user._id,
        status: 'active'
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title createdAt likesCount commentsCount status')
        .lean(),
      ForumComment.find({
        author: user._id,
        status: 'active'
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('threadId', 'title')
        .select('content createdAt threadId')
        .lean()
    ]);

    // Combine and sort activities
    const activities = [
      ...recentIncidents.map(inc => ({
        type: 'report',
        description: `Reportó un incidente de ${inc.type}`,
        timestamp: inc.createdAt
      })),
      ...recentValidations.map(val => ({
        type: 'validation',
        description: `Validó un reporte como ${val.vote === 1 ? 'válido' : 'inválido'}`,
        timestamp: val.createdAt
      }))
    ]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    const threadStats = forumThreadStats?.[0] || { totalLikes: 0, totalComments: 0 };
    const commentLikes = forumCommentLikes?.[0] || { totalLikes: 0 };

    const forumData = {
      stats: {
        threadsCreated: forumThreadsCount || 0,
        commentsMade: forumCommentsCount || 0,
        repliesReceived: threadStats.totalComments || 0,
        likesReceived: (threadStats.totalLikes || 0) + (commentLikes.totalLikes || 0)
      },
      recentThreads: (recentForumThreads || []).map(thread => ({
        id: thread._id?.toString(),
        title: thread.title,
        createdAt: thread.createdAt,
        commentsCount: thread.commentsCount || 0,
        likesCount: thread.likesCount || 0,
        status: thread.status
      })),
      recentComments: (recentForumComments || []).map(comment => ({
        id: comment._id?.toString(),
        content: comment.content,
        createdAt: comment.createdAt,
        thread: comment.threadId
          ? {
              id: comment.threadId._id?.toString(),
              title: comment.threadId.title
            }
          : null
      }))
    };

    const profileData = {
      user: {
        id: user._id,
        uid: user.uid,
        username: user.name || user.email,
        email: user.email,
        picture: user.picture,
        role: user.role,
        createdAt: user.createdAt
      },
      stats: {
        totalReports: user.reportCount || 0,
        totalValidations: user.validationCount || 0,
        reputation: user.reputacion || 50
      },
      recentActivity: activities,
      settings: {
        emailNotifications: true,
        publicProfile: false,
        showLocation: true
      },
      forum: forumData
    };

    res.json(profileData);
  } catch (error) {
    logger.error('Error getting profile:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

/**
 * PUT /auth/settings
 * Actualizar configuración del usuario
 */
router.put('/settings', (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { emailNotifications, publicProfile, showLocation } = req.body;

    // En producción, aquí guardarías en la base de datos
    // Por ahora solo retornamos éxito
    logger.info('Settings updated for user:', { userId: req.session.user.id, settings: req.body });

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente'
    });
  } catch (error) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

/**
 * DELETE /auth/delete-account
 * Eliminar cuenta del usuario (permanentemente)
 */
router.delete('/delete-account', (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const userId = req.session.user.id;
    const username = req.session.user.username;

    // En producción, aquí eliminarías:
    // 1. Todos los reportes del usuario de la base de datos
    // 2. Todas las validaciones del usuario
    // 3. Todos los comentarios del usuario
    // 4. El registro del usuario
    // 5. Cualquier archivo asociado (imágenes, etc.)

    logger.info('Account deletion requested for user:', { userId, username });

    // IMPORTANTE: En producción deberías hacer algo como:
    // await User.findByIdAndDelete(userId);
    // await Incident.deleteMany({ userId: userId });
    // await Validation.deleteMany({ userId: userId });
    // etc.

    // Destruir la sesión
    req.session.destroy((err) => {
      if (err) {
        logger.error('Error destroying session:', err);
        return res.status(500).json({ error: 'Error al cerrar sesión' });
      }

      res.json({
        success: true,
        message: 'Cuenta eliminada exitosamente'
      });
    });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({ error: 'Error al eliminar cuenta' });
  }
});

// Ruta /auth/clear-session eliminada - Auth0 maneja el logout automáticamente en /logout

export default router;
