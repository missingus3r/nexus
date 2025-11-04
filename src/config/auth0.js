import { auth } from 'express-openid-connect';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Get Auth0 Configuration - Simplificado
 *
 * Configuración simple y unificada para local y producción.
 * No hay diferencias entre ambientes - solo usa AUTH0_BASE_URL del .env
 *
 * Rutas automáticas:
 * - /login - Redirige a Auth0
 * - /logout - Cierra sesión
 * - /callback - Maneja callback de Auth0
 */
function getAuth0Config() {
  const baseURL = process.env.AUTH0_BASE_URL;

  if (!baseURL) {
    logger.error('AUTH0_BASE_URL no está configurado en .env');
    throw new Error('AUTH0_BASE_URL es requerido');
  }

  logger.info(`Auth0 Config - baseURL: ${baseURL}`);

  return {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.AUTH0_SECRET,
    baseURL: baseURL,
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    routes: {
      callback: '/callback',
      login: '/login',
      logout: '/logout',
      postLogoutRedirect: '/'
    },
    authorizationParams: {
      prompt: 'login'
    },
    // Después del login exitoso: crear/actualizar usuario y redirigir según rol
    afterCallback: async (req, res, session) => {
      try {
        if (!session?.id_token) {
          logger.error('Auth0 afterCallback: session o id_token no disponible');
          return session;
        }

        // Decodificar JWT para obtener datos del usuario
        const tokenParts = session.id_token.split('.');
        if (tokenParts.length !== 3) {
          logger.error('Auth0 afterCallback: Formato JWT inválido');
          return session;
        }

        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());
        const { email, sub: auth0Sub, name, picture } = payload;

        if (!email || !auth0Sub) {
          logger.error('Auth0 afterCallback: Faltan email o sub');
          return session;
        }

        // Verificar si es admin
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const isAdmin = adminEmail && email.toLowerCase() === adminEmail;

        logger.info(`Login exitoso: ${email} - ${isAdmin ? 'ADMIN' : 'USER'}`);

        // Buscar o crear usuario
        let user = await User.findOne({ email });

        if (!user) {
          user = new User({
            uid: auth0Sub,
            auth0Sub: auth0Sub,
            email: email,
            name: name || email.split('@')[0],
            picture: picture || '',
            role: isAdmin ? 'admin' : 'user',
            reputacion: 50,
            reportCount: 0,
            validationCount: 0,
            strikes: 0,
            banned: false,
            lastLogin: new Date()
          });
          await user.save();
          logger.info(`Usuario creado: ${email} - rol: ${user.role}`);
        } else {
          // Actualizar usuario existente
          user.lastLogin = new Date();
          user.lastActivity = new Date();
          user.auth0Sub = auth0Sub;
          if (picture) user.picture = picture;
          if (name) user.name = name;
          if (isAdmin && user.role !== 'admin') {
            user.role = 'admin';
            logger.info(`Usuario promovido a admin: ${email}`);
          }
          await user.save();
          logger.info(`Usuario actualizado: ${email}`);
        }

        // Guardar en sesión y configurar redirección
        if (!req.session) {
          logger.error('Sesión no disponible en afterCallback');
          return session;
        }

        req.session.user = {
          id: user._id.toString(),
          uid: user.uid,
          email: user.email,
          role: user.role,
          picture: user.picture,
          name: user.name
        };

        // Redirigir según rol: admin -> /admin, user -> /dashboard
        const redirectTo = isAdmin ? '/admin' : '/dashboard';

        return new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              logger.error('Error guardando sesión:', err);
              reject(err);
            } else {
              logger.info(`Sesión guardada. Redirección a: ${redirectTo}`);
              return res.redirect(redirectTo);
            }
          });
        });
      } catch (error) {
        logger.error('Error en afterCallback:', error);
        return session;
      }
    }
  };
}

/**
 * Auth0 middleware factory
 * Returns middleware that attaches /login, /logout, and /callback routes to the baseURL
 * Created lazily to ensure env vars are loaded
 */
let _auth0Middleware = null;
export function getAuth0Middleware() {
  if (!_auth0Middleware) {
    _auth0Middleware = auth(getAuth0Config());
  }
  return _auth0Middleware;
}

// For backward compatibility, export as middleware function
export const auth0Middleware = (req, res, next) => {
  return getAuth0Middleware()(req, res, next);
};

/**
 * Middleware simplificado para proteger rutas
 * Verifica si el usuario está autenticado vía OIDC o sesión Express
 */
export const requireAuth = (req, res, next) => {
  // Verificar autenticación OIDC
  const isOidcAuth = req.oidc?.isAuthenticated?.();

  // Si está autenticado en OIDC, permitir acceso
  if (isOidcAuth) {
    return next();
  }

  // Si no está autenticado en OIDC, verificar sesión Express como fallback
  // Esto permite que usuarios con sesión válida accedan mientras OIDC se refresca
  if (req.session?.user?.email) {
    logger.info(`Usuario ${req.session.user.email} accediendo con sesión Express (OIDC no disponible)`);
    return next();
  }

  // No autenticado: redirigir según tipo de ruta
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  logger.info(`Acceso no autorizado a ${req.path}, redirigiendo a login`);
  return res.redirect('/login');
};

/**
 * Helper simplificado para obtener usuario autenticado
 * Primero intenta Auth0, luego sesión
 */
export const getAuthenticatedUser = async (req) => {
  // Verificar Auth0
  if (req.oidc?.isAuthenticated?.()) {
    const email = req.oidc.user?.email;
    if (email) {
      const user = await User.findOne({ email });
      if (user) {
        return {
          email: user.email,
          name: user.name,
          role: user.role,
          uid: user.uid,
          picture: user.picture,
          _id: user._id
        };
      }
    }
  }

  // Fallback a sesión
  if (req.session?.user) {
    return req.session.user;
  }

  return null;
};
