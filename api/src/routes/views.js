import express from 'express';
import { checkMaintenance } from '../middleware/maintenanceCheck.js';

const router = express.Router();

// Middleware to inject user and auth info into all views
router.use((req, res, next) => {
  res.locals.isAuthenticated = !!req.session?.user;
  res.locals.user = req.session?.user || null;
  next();
});

/**
 * Home / Landing page
 */
router.get('/', (req, res) => {
  res.render('landing', {
    title: 'NEXUS - Plataforma Integral',
    page: 'landing'
  });
});

/**
 * Detalle plataforma Nexus
 */
router.get('/plataforma', (req, res) => {
  res.render('plataforma', {
    title: 'NEXUS Plataforma - Capacidades y Experiencia',
    page: 'plataforma'
  });
});

/**
 * Centinel page (map + security features)
 */
router.get('/centinel', checkMaintenance('centinel'), (req, res) => {
  res.render('centinel', {
    title: 'NEXUS Centinel - Mapa en Tiempo Real',
    page: 'centinel'
  });
});

/**
 * News page
 */
router.get('/news', (req, res) => {
  res.render('news', {
    title: 'Noticias Geolocalizadas - Nexus',
    page: 'news'
  });
});

/**
 * Forum page
 */
router.get('/forum', checkMaintenance('forum'), (req, res) => {
  res.render('forum', {
    title: 'Foro Comunitario - Nexus',
    page: 'forum'
  });
});

/**
 * Nexus Forum - Thread list
 */
router.get('/forum-nexus', checkMaintenance('forum'), (req, res) => {
  res.render('forum-nexus', {
    title: 'Foro Nexus - Nexus',
    page: 'forum'
  });
});

/**
 * Nexus Forum - Thread view
 */
router.get('/forum-thread/:id', checkMaintenance('forum'), (req, res) => {
  res.render('forum-thread', {
    title: 'Thread - Foro Nexus',
    page: 'forum'
  });
});

/**
 * Links page (Ministry of Interior)
 */
router.get('/links', (req, res) => {
  res.render('links', {
    title: 'Enlaces Oficiales - Nexus',
    page: 'links'
  });
});

/**
 * Surlink hub
 */
router.get('/surlink', checkMaintenance('surlink'), (req, res) => {
  res.render('surlink', {
    title: 'NEXUS Surlink - Ecosistema inmobiliario, académico y automotriz',
    page: 'surlink'
  });
});

/**
 * Pricing page
 */
router.get('/pricing', (req, res) => {
  res.render('pricing', {
    title: 'Planes y Precios - Nexus',
    page: 'pricing'
  });
});

/**
 * Profile page (requires auth)
 */
router.get('/perfil', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('perfil', {
    title: 'Mi Perfil - Nexus',
    page: 'perfil'
  });
});

/**
 * Login page
 */
router.get('/login', (req, res) => {
  res.render('login', {
    title: 'Iniciar Sesión - Nexus',
    page: 'login'
  });
});

/**
 * Privacy policy
 */
router.get('/privacy', (req, res) => {
  res.render('privacy', {
    title: 'Política de Privacidad - Nexus',
    page: 'privacy'
  });
});

/**
 * Terms of service
 */
router.get('/terms', (req, res) => {
  res.render('terms', {
    title: 'Términos de Servicio - Nexus',
    page: 'terms'
  });
});

/**
 * Admin page (requires admin role)
 */
router.get('/admin', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).send('Acceso denegado - Se requiere rol de administrador');
  }

  res.render('admin', {
    title: 'Panel de Administración - Nexus',
    page: 'admin'
  });
});

/**
 * Logout
 */
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

export default router;
