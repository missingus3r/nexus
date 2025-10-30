import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';

// Config
dotenv.config();

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API Routes
import authRoutes from './src/routes/auth.js';
import incidentRoutes from './src/routes/incidents.js';
import heatmapRoutes from './src/routes/heatmap.js';
import neighborhoodRoutes from './src/routes/neighborhoods.js';
import newsRoutes from './src/routes/news.js';
import linksRoutes from './src/routes/links.js';
import adminRoutes from './src/routes/admin.js';
import notificationRoutes from './src/routes/notifications.js';
import surlinkRoutes from './src/routes/surlink.js';
import pricingRoutes from './src/routes/pricing.js';
import forumRoutes from './src/routes/forum.js';
import dashboardRoutes from './src/routes/dashboard.js';

// View Routes
import viewRoutes from './src/routes/views.js';

// Middleware
import { errorHandler } from './src/middleware/errorHandler.js';
import { rateLimiter } from './src/middleware/rateLimiter.js';
import { trackPageVisit } from './src/middleware/pageTracking.js';

// Auth0
import { auth0Middleware, setupOidcLocals, handleLandingRedirect } from './src/config/auth0.js';

// Sockets
import { initializeSocketHandlers } from './src/sockets/eventHandlers.js';

// Jobs
import { startCronJobs } from './src/jobs/index.js';

// Logger
import logger from './src/utils/logger.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:8080',
    credentials: true
  }
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'vortex-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Auth0 middleware - attaches /login, /logout, and /callback routes
app.use(auth0Middleware);

// Handle post-login redirect from landing page
app.use(handleLandingRedirect);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for MapLibre
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => logger.info('MongoDB connected successfully'))
  .catch(err => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Make io accessible to routes
app.set('io', io);

// Middleware to pass user to all views
// This integrates both the legacy session-based auth and Auth0
app.use((req, res, next) => {
  // Check Auth0 authentication
  const oidcUser = req.oidc?.user || null;
  const isOidcAuthenticated = req.oidc?.isAuthenticated() || false;

  // Prefer Auth0 user if authenticated, fallback to session user
  res.locals.user = isOidcAuthenticated ? oidcUser : (req.session.user || null);
  res.locals.isAuthenticated = isOidcAuthenticated || !!req.session.user;
  res.locals.oidc = req.oidc; // Make OIDC context available in views
  next();
});

// Track page visits (after session middleware so we can access user info)
app.use(trackPageVisit);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/map/incidents', incidentRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/neighborhoods', neighborhoodRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/surlink', surlinkRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/forum', forumRoutes);

// Dashboard routes (includes both view and API routes)
app.use('/', dashboardRoutes);

// View Routes (serve HTML pages)
app.use('/', viewRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Auth0 test route
app.get('/auth-status', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Auth0 Status</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status {
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .authenticated {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .not-authenticated {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        .user-info {
          background-color: #e7f3ff;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          margin: 10px 5px;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          transition: background-color 0.3s;
        }
        .button:hover {
          background-color: #0056b3;
        }
        .logout-button {
          background-color: #dc3545;
        }
        .logout-button:hover {
          background-color: #c82333;
        }
        pre {
          background-color: #f4f4f4;
          padding: 15px;
          border-radius: 4px;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 Auth0 Integration Status</h1>

        <div class="status ${req.oidc.isAuthenticated() ? 'authenticated' : 'not-authenticated'}">
          <strong>Authentication Status:</strong> ${req.oidc.isAuthenticated() ? '✅ Logged in' : '❌ Logged out'}
        </div>

        ${req.oidc.isAuthenticated() ? `
          <div class="user-info">
            <h3>User Information</h3>
            <pre>${JSON.stringify(req.oidc.user, null, 2)}</pre>
          </div>
          <a href="/logout" class="button logout-button">Logout</a>
        ` : `
          <p>You are not currently logged in. Click the button below to authenticate with Auth0.</p>
          <a href="/login" class="button">Login with Auth0</a>
        `}

        <hr style="margin: 30px 0;">

        <h3>Available Routes</h3>
        <ul>
          <li><code>/login</code> - Redirect to Auth0 login</li>
          <li><code>/logout</code> - Logout and redirect to homepage</li>
          <li><code>/callback</code> - Auth0 callback handler (automatic)</li>
          <li><code>/auth-status</code> - This page (authentication status)</li>
        </ul>

        <a href="/" class="button">← Back to Home</a>
      </div>
    </body>
    </html>
  `);
});

// Error handler (must be last)
app.use(errorHandler);

// Socket.IO
initializeSocketHandlers(io);

// Start cron jobs
startCronJobs(io);

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
  await mongoose.connection.close();
  process.exit(0);
});

export { io };
