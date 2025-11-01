import express from 'express';
import { checkMaintenance } from '../middleware/maintenanceCheck.js';
import { getAuthenticatedUser } from '../config/auth0.js';

const router = express.Router();

// Middleware to inject user and auth info into all views
router.use((req, res, next) => {
  const isOidcAuthenticated = typeof req.oidc?.isAuthenticated === 'function'
    ? req.oidc.isAuthenticated()
    : false;
  const sessionUser = req.session?.user || null;
  const hasSessionUser = !!sessionUser;
  const oidcUser = isOidcAuthenticated ? (req.oidc?.user || null) : null;

  res.locals.isAuthenticated = !!res.locals.isAuthenticated || isOidcAuthenticated || hasSessionUser;
  res.locals.user = res.locals.user || oidcUser || sessionUser || null;

  next();
});

/**
 * Home / Landing page
 */
router.get('/', (req, res) => {
  res.render('landing', {
    title: 'VORTEX - Plataforma Integral',
    page: 'landing'
  });
});

/**
 * Detalle plataforma Vortex
 */
router.get('/plataforma', (req, res) => {
  res.render('plataforma', {
    title: 'VORTEX Plataforma - Capacidades y Experiencia',
    page: 'plataforma'
  });
});

/**
 * Social y crowdfunding
 */
router.get('/social', (req, res) => {
  res.render('social', {
    title: 'Social Comunitario - Vortex',
    page: 'social'
  });
});

/**
 * Centinel page (map + security features)
 */
router.get('/centinel', checkMaintenance('centinel'), (req, res) => {
  res.render('centinel', {
    title: 'VORTEX Centinel - Mapa en Tiempo Real',
    page: 'centinel'
  });
});

/**
 * News page
 */
router.get('/news', (req, res) => {
  res.render('news', {
    title: 'Noticias Geolocalizadas - Vortex',
    page: 'news'
  });
});

/**
 * Forum page
 */
router.get('/forum', checkMaintenance('forum'), (req, res) => {
  res.render('forum', {
    title: 'Foro Comunitario - Vortex',
    page: 'forum'
  });
});

/**
 * Vortex Forum - Thread list
 */
router.get('/forum-vortex', checkMaintenance('forum'), (req, res) => {
  res.render('forum-vortex', {
    title: 'Foro Vortex - Vortex',
    page: 'forum'
  });
});

/**
 * Vortex Forum - Thread view
 */
router.get('/forum-thread/:id', checkMaintenance('forum'), (req, res) => {
  res.render('forum-thread', {
    title: 'Thread - Foro Vortex',
    page: 'forum'
  });
});

/**
 * Links page (Ministry of Interior)
 */
router.get('/links', (req, res) => {
  res.render('links', {
    title: 'Enlaces Oficiales - Vortex',
    page: 'links'
  });
});

/**
 * Surlink hub
 */
router.get('/surlink', checkMaintenance('surlink'), (req, res) => {
  res.render('surlink', {
    title: 'VORTEX Surlink - Ecosistema inmobiliario, académico y automotriz',
    page: 'surlink'
  });
});

/**
 * Pricing page
 */
router.get('/pricing', (req, res) => {
  res.render('pricing', {
    title: 'Planes y Precios - Vortex',
    page: 'pricing'
  });
});

/**
 * Profile page (requires auth)
 */
router.get('/perfil', async (req, res) => {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return res.redirect('/login');
  }
  res.render('perfil', {
    title: 'Mi Perfil - Vortex',
    page: 'perfil',
    user
  });
});

/**
 * Login page
 */
router.get('/login', (req, res) => {
  res.render('login', {
    title: 'Iniciar Sesión - Vortex',
    page: 'login'
  });
});

/**
 * Privacy policy
 */
router.get('/privacy', (req, res) => {
  res.render('privacy', {
    title: 'Política de Privacidad - Vortex',
    page: 'privacy'
  });
});

/**
 * Terms of service
 */
router.get('/terms', (req, res) => {
  res.render('terms', {
    title: 'Términos de Servicio - Vortex',
    page: 'terms'
  });
});

/**
 * Admin page (requires admin role)
 */
router.get('/admin', async (req, res) => {
  const user = await getAuthenticatedUser(req);

  if (!user) {
    return res.redirect('/login');
  }

  if (user.role !== 'admin') {
    return res.status(403).send('Acceso denegado - Se requiere rol de administrador');
  }

  res.render('admin', {
    title: 'Panel de Administración - Vortex',
    page: 'admin',
    user
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
