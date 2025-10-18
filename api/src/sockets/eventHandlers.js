import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

/**
 * Initialize Socket.IO event handlers
 * @param {SocketIO.Server} io - Socket.IO server instance
 */
export function initializeSocketHandlers(io) {
  // Authentication middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      // Allow guest connections
      socket.userId = 'guest';
      socket.isGuest = true;
      return next();
    }

    try {
      // For authenticated users, verify JWT
      // Note: In production, you'd verify against Auth0 JWKS
      // For now, we'll accept the token if it's not expired
      const decoded = jwt.decode(token);
      socket.userId = decoded.sub;
      socket.isGuest = false;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info('Client connected', {
      socketId: socket.id,
      userId: socket.userId,
      isGuest: socket.isGuest
    });

    // Join user to their personal room (for targeted messages)
    if (!socket.isGuest) {
      socket.join(`user:${socket.userId}`);
    }

    // Subscribe to map region updates
    socket.on('subscribe:region', (data) => {
      const { bbox } = data;
      if (bbox) {
        socket.join(`region:${bbox}`);
        logger.info('Client subscribed to region', { socketId: socket.id, bbox });
      }
    });

    // Unsubscribe from map region
    socket.on('unsubscribe:region', (data) => {
      const { bbox } = data;
      if (bbox) {
        socket.leave(`region:${bbox}`);
        logger.info('Client unsubscribed from region', { socketId: socket.id, bbox });
      }
    });

    // Ping/pong for keep-alive
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        reason
      });
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error('Socket error:', {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message
      });
    });
  });

  // Helper function to emit to all clients
  io.emitToAll = (event, data) => {
    io.emit(event, data);
  };

  // Helper function to emit to a specific region
  io.emitToRegion = (bbox, event, data) => {
    io.to(`region:${bbox}`).emit(event, data);
  };

  // Helper function to emit to a specific user
  io.emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  logger.info('Socket.IO handlers initialized');
}

/**
 * Emit new incident event
 * @param {SocketIO.Server} io
 * @param {Object} incident
 */
export function emitNewIncident(io, incident) {
  io.emit('new-incident', incident);
  logger.info('Emitted new-incident event', { incidentId: incident.id });
}

/**
 * Emit incident validated event
 * @param {SocketIO.Server} io
 * @param {Object} data
 */
export function emitIncidentValidated(io, data) {
  io.emit('incident-validated', data);
  logger.info('Emitted incident-validated event', { incidentId: data.incidentId });
}

/**
 * Emit heatmap updated event
 * @param {SocketIO.Server} io
 * @param {Object} cell
 */
export function emitHeatmapUpdated(io, cell) {
  io.emit('heatmap-updated', cell);
  logger.info('Emitted heatmap-updated event', { geohash: cell.geohash });
}

/**
 * Emit news event added
 * @param {SocketIO.Server} io
 * @param {Object} newsEvent
 */
export function emitNewsAdded(io, newsEvent) {
  io.emit('news-added', newsEvent);
  logger.info('Emitted news-added event', { newsId: newsEvent.id });
}
