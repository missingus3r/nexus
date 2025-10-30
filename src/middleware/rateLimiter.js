import rateLimit from 'express-rate-limit';

// Rate limit configuration from environment variables with sensible defaults
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // Default: 1 minute
const RATE_LIMIT_MAX_GUEST = parseInt(process.env.RATE_LIMIT_MAX_GUEST) || 100; // Default: 100 requests per window
const RATE_LIMIT_MAX_AUTH = parseInt(process.env.RATE_LIMIT_MAX_AUTH) || 300; // Default: 300 requests per window

// Different rate limits for different user types
export const rateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: async (req) => {
    // In development, use higher limits
    if (process.env.NODE_ENV === 'development') {
      return 10000; // Very high limit for development
    }

    // Authenticated users get higher limits
    if (req.auth && req.auth.sub && req.auth.sub !== 'guest') {
      return RATE_LIMIT_MAX_AUTH;
    }
    // Guest/anonymous users get moderate limits
    return RATE_LIMIT_MAX_GUEST;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later',
    retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
  },
  // Using in-memory store (Redis store removed to avoid circular dependency)
  // For distributed rate limiting in production, consider using rate-limit-redis package
  keyGenerator: (req) => {
    // Use auth sub if available, otherwise IP
    return req.auth?.sub || req.ip;
  }
});

// Write operations rate limit configuration
const WRITE_RATE_LIMIT_WINDOW_MS = parseInt(process.env.WRITE_RATE_LIMIT_WINDOW_MS) || 60 * 1000; // Default: 1 minute
const WRITE_RATE_LIMIT_MAX_GUEST = parseInt(process.env.WRITE_RATE_LIMIT_MAX_GUEST) || 30; // Default: 30 writes per window
const WRITE_RATE_LIMIT_MAX_AUTH = parseInt(process.env.WRITE_RATE_LIMIT_MAX_AUTH) || 120; // Default: 120 writes per window

// Stricter rate limit for write operations (POST, PUT, DELETE)
export const writeRateLimiter = rateLimit({
  windowMs: WRITE_RATE_LIMIT_WINDOW_MS,
  max: async (req) => {
    // In development, use higher limits
    if (process.env.NODE_ENV === 'development') {
      return 5000; // Very high limit for development
    }

    if (req.auth && req.auth.sub && req.auth.sub !== 'guest') {
      return WRITE_RATE_LIMIT_MAX_AUTH;
    }
    return WRITE_RATE_LIMIT_MAX_GUEST;
  },
  message: {
    error: 'Too many write operations, please slow down',
    retryAfter: Math.ceil(WRITE_RATE_LIMIT_WINDOW_MS / 1000)
  },
  keyGenerator: (req) => req.auth?.sub || req.ip
});
