import rateLimit from 'express-rate-limit';

// Different rate limits for different user types
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    // In development, use higher limits
    if (process.env.NODE_ENV === 'development') {
      return 1000; // Very high limit for development
    }

    // Authenticated users get higher limits
    if (req.auth && req.auth.sub && req.auth.sub !== 'guest') {
      return 100; // 100 requests per minute
    }
    // Guest/anonymous users get moderate limits
    return 30; // 30 requests per minute
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later',
    retryAfter: 60
  },
  // Using in-memory store (Redis store removed to avoid circular dependency)
  // For distributed rate limiting in production, consider using rate-limit-redis package
  keyGenerator: (req) => {
    // Use auth sub if available, otherwise IP
    return req.auth?.sub || req.ip;
  }
});

// Stricter rate limit for write operations (POST, PUT, DELETE)
export const writeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    // In development, use higher limits
    if (process.env.NODE_ENV === 'development') {
      return 500; // Very high limit for development
    }

    if (req.auth && req.auth.sub && req.auth.sub !== 'guest') {
      return 50; // 50 writes per minute for authenticated
    }
    return 10; // 10 writes per minute for guests
  },
  message: {
    error: 'Too many write operations, please slow down',
    retryAfter: 60
  },
  keyGenerator: (req) => req.auth?.sub || req.ip
});
