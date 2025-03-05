const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger').createLogger('routes');
const path = require('path');

// Try to import rate limiter, fallback if not available
let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  logger.warn('express-rate-limit not installed, rate limiting disabled');
  // Create a no-op middleware as fallback
  rateLimit = () => (req, res, next) => next();
}

// Import middleware with error handling
let apiLogger, errorHandler;
try {
  apiLogger = require('../middleware/logging').apiLogger;
  errorHandler = require('../middleware/errorHandler');
} catch (e) {
  logger.error('Failed to load middleware:', e);
  // Create fallback middleware
  apiLogger = (req, res, next) => next();
  errorHandler = (err, req, res, next) => {
    res.status(500).json({ error: true, message: err.message || 'Internal server error' });
  };
}

// Import all service routes
const routes = {
  agents: require('./agents'),
  metrics: require('./metrics'),
  settings: require('./settings'),
  tools: require('./tools'),
  workflows: require('./workflows'),
  uplink: require('./uplink'),
  backup: require('./backup'),
  config: require('./config'),
  // Add any additional service routes here
};

// API Rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Too many requests, please try again later.'
  }
});

// Apply global middleware
router.use(apiLogger);
router.use(apiLimiter);

// Apply routes both to /v1 and root for backward compatibility
Object.entries(routes).forEach(([name, handler]) => {
  router.use(`/v1/${name}`, handler);
  router.use(`/${name}`, handler);  // Backward compatibility
});

// Health check endpoint with detailed info
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    services: Object.keys(routes),
    memory: {
      usage: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB'
    }
  });
});

// Apply error handler
router.use(errorHandler);

// Basic error handler for routes
router.use((err, req, res, next) => {
  logger.error('Route error:', err);
  res.status(500).json({
    error: true,
    message: 'Internal server error'
  });
});

module.exports = router;
