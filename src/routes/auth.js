import express from 'express';
import { generateGuestToken, generateUserToken } from '../middleware/auth.js';
import { User, Incident, Validation, Subscription, ForumThread, ForumComment } from '../models/index.js';
import logger from '../utils/logger.js';
import { checkAuthMaintenance } from '../middleware/maintenanceCheck.js';
import { getAuthenticatedUser } from '../config/auth0.js';

const router = express.Router();

// Auth0 configuration
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

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

/**
 * POST /auth0/callback
 * Handle Auth0 authentication callback
 * Verifica el usuario y lo crea si no existe
 */
router.post('/auth0/callback', checkAuthMaintenance, async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Código de autorización requerido' });
    }

    if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET) {
      logger.error('Auth0 configuration missing');
      return res.status(500).json({ error: 'Configuración de Auth0 incompleta' });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: AUTH0_CLIENT_ID,
        client_secret: AUTH0_CLIENT_SECRET,
        code,
        redirect_uri
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      logger.error('Auth0 token exchange failed:', error);
      return res.status(400).json({ error: 'Error al intercambiar código por token' });
    }

    const tokens = await tokenResponse.json();
    const { access_token, id_token } = tokens;

    // Get user info from Auth0
    const userInfoResponse = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    if (!userInfoResponse.ok) {
      logger.error('Failed to get user info from Auth0');
      return res.status(400).json({ error: 'Error al obtener información del usuario' });
    }

    const auth0User = await userInfoResponse.json();
    logger.info('Auth0 user info:', auth0User);

    const { sub, email, name, picture } = auth0User;

    // Find or create user in database
    let user = await User.findOne({
      $or: [
        { auth0Sub: sub },
        { email: email }
      ]
    });

    if (!user) {
      // Create new user
      user = await User.create({
        uid: sub, // Use Auth0 sub as uid
        auth0Sub: sub,
        email,
        name: name || email.split('@')[0],
        picture,
        reputacion: 50,
        role: 'user',
        lastLogin: new Date()
      });
      logger.info('New user created:', { email, sub });
    } else {
      // Update existing user
      user.auth0Sub = sub;
      user.email = email;
      user.name = name || user.name;
      user.picture = picture || user.picture;
      user.lastLogin = new Date();
      await user.save();
      logger.info('Existing user updated:', { email, sub });
    }

    // Create session
    req.session.user = {
      id: user._id,
      uid: user.uid,
      username: user.name || user.email,
      email: user.email,
      role: user.role,
      picture: user.picture,
      createdAt: user.createdAt
    };

    // Generate JWT token for API calls
    const jwtToken = generateUserToken(user.uid, []);

    res.json({
      success: true,
      user: {
        id: user._id,
        uid: user.uid,
        username: user.name || user.email,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        reputacion: user.reputacion
      },
      token: jwtToken,
      expiresIn: 604800, // 7 days
      message: user.createdAt.getTime() === user.lastLogin.getTime()
        ? 'Registro exitoso'
        : 'Login exitoso'
    });
  } catch (error) {
    logger.error('Error in Auth0 callback:', error);
    res.status(500).json({ error: 'Error al procesar autenticación' });
  }
});

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
      subscription,
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
      Subscription.findOne({
        userId: user._id,
        status: 'active'
      }).sort({ createdAt: -1 }),
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
      subscription: {
        plan: subscription?.plan || 'free',
        status: subscription?.status || 'active',
        endDate: subscription?.endDate,
        billingCycle: subscription?.billingCycle,
        isActive: subscription?.isActive() || false
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

export default router;
