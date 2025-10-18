import express from 'express';
import { generateGuestToken, generateUserToken } from '../middleware/auth.js';
import { User, Incident, Validation } from '../models/index.js';

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

/**
 * POST /auth/dev-login
 * Auto-login con credenciales por defecto (solo desarrollo)
 */
router.post('/dev-login', async (req, res) => {
  try {
    const defaultUser = process.env.DEFAULT_USER || 'admin';
    const defaultPass = process.env.DEFAULT_PASS || 'admin';

    const userId = `${defaultUser}-uid`;

    // Find or create user in database
    let user = await User.findOne({ uid: userId });
    if (!user) {
      user = await User.create({
        uid: userId,
        reputacion: defaultUser === 'admin' ? 100 : 50,
        role: defaultUser === 'admin' ? 'admin' : 'user'
      });
    }

    // Crear sesión de usuario (para admin panel)
    req.session.user = {
      id: user._id,
      uid: userId,
      username: defaultUser,
      email: `${defaultUser}@nexus.dev`,
      role: user.role,
      createdAt: user.createdAt
    };

    // Generate JWT token
    const token = generateUserToken(userId, []);

    res.json({
      success: true,
      user: {
        id: user._id,
        uid: userId,
        username: defaultUser,
        email: `${defaultUser}@nexus.dev`,
        role: user.role,
        reputacion: user.reputacion
      },
      token,
      expiresIn: 604800, // 7 days in seconds
      message: 'Login exitoso (modo desarrollo)'
    });
  } catch (error) {
    console.error('Error in dev-login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

/**
 * GET /auth/profile
 * Obtener datos del perfil del usuario actual
 */
router.get('/profile', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Get user from database with real stats
    const user = await User.findOne({ uid: req.session.user.uid });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Get recent activity (last 10 actions)
    const recentIncidents = await Incident.find({
      reporterUid: user.uid
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('type createdAt');

    const recentValidations = await Validation.find({
      uid: user.uid
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('vote createdAt incidentId');

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

    const profileData = {
      user: {
        id: user._id,
        username: user.uid,
        email: req.session.user.email || '',
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
      }
    };

    res.json(profileData);
  } catch (error) {
    console.error('Error getting profile:', error);
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
    console.log('Settings updated for user:', req.session.user.id, req.body);

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating settings:', error);
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

    console.log('Account deletion requested for user:', userId, username);

    // IMPORTANTE: En producción deberías hacer algo como:
    // await User.findByIdAndDelete(userId);
    // await Incident.deleteMany({ userId: userId });
    // await Validation.deleteMany({ userId: userId });
    // etc.

    // Destruir la sesión
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).json({ error: 'Error al cerrar sesión' });
      }

      res.json({
        success: true,
        message: 'Cuenta eliminada exitosamente'
      });
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Error al eliminar cuenta' });
  }
});

export default router;
