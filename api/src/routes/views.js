import express from 'express';

const router = express.Router();

/**
 * Home / Map page
 */
router.get('/', (req, res) => {
    res.render('map', {
        title: 'Mapa en Tiempo Real - Nexus',
        page: 'map'
    });
});

/**
 * Map page (explicit route)
 */
router.get('/map', (req, res) => {
    res.render('map', {
        title: 'Mapa en Tiempo Real - Nexus',
        page: 'map'
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
router.get('/forum', (req, res) => {
    res.render('forum', {
        title: 'Foro Comunitario - Nexus',
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
