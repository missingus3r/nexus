import express from 'express';
import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import NewsEvent from '../models/NewsEvent.js';

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
      redisConnected: false, // Redis está deshabilitado
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

export default router;
