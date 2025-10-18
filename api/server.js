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
import newsRoutes from './src/routes/news.js';
import linksRoutes from './src/routes/links.js';
import adminRoutes from './src/routes/admin.js';
import notificationRoutes from './src/routes/notifications.js';

// View Routes
import viewRoutes from './src/routes/views.js';

// Middleware
import { errorHandler } from './src/middleware/errorHandler.js';
import { rateLimiter } from './src/middleware/rateLimiter.js';

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
  secret: process.env.SESSION_SECRET || 'nexus-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

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
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => logger.info('MongoDB connected successfully'))
.catch(err => {
  logger.error('MongoDB connection error:', err);
  process.exit(1);
});

// Make io accessible to routes
app.set('io', io);

// Middleware to pass user to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.isAuthenticated = !!req.session.user;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/map/incidents', incidentRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

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
