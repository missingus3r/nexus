import express from 'express';
import { generateGuestToken } from '../middleware/auth.js';

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
router.post('/dev-login', (req, res) => {
  try {
    const defaultUser = process.env.DEFAULT_USER || 'admin';
    const defaultPass = process.env.DEFAULT_PASS || 'admin';

    // Crear sesión de usuario
    req.session.user = {
      id: 'dev-user-1',
      username: defaultUser,
      email: `${defaultUser}@nexus.dev`,
      role: defaultUser === 'admin' ? 'admin' : 'user',
      createdAt: new Date()
    };

    res.json({
      success: true,
      user: req.session.user,
      role: req.session.user.role,
      message: 'Login exitoso (modo desarrollo)'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

/**
 * GET /auth/profile
 * Obtener datos del perfil del usuario actual
 */
router.get('/profile', (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // En desarrollo, retornamos datos simulados
    // En producción, esto consultaría la base de datos
    const profileData = {
      user: {
        id: req.session.user.id,
        username: req.session.user.username,
        email: req.session.user.email,
        role: req.session.user.role,
        createdAt: req.session.user.createdAt
      },
      stats: {
        totalReports: Math.floor(Math.random() * 20) + 5, // Simulado
        totalValidations: Math.floor(Math.random() * 15) + 2, // Simulado
        reputation: Math.floor(Math.random() * 100) + 50 // Simulado
      },
      recentActivity: [
        {
          type: 'report',
          description: 'Reporte de incidente en Montevideo',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          type: 'validation',
          description: 'Validó un reporte de rapiña',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
        },
        {
          type: 'report',
          description: 'Reporte de hurto en Pocitos',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      ],
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
