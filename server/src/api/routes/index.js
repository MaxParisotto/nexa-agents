const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger').createLogger('routes');

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

// Import route modules safely
const loadRoute = (name) => {
  try {
    return require(`./${name}`);
  } catch (e) {
    logger.error(`Failed to load route module: ${name}`, e);
    const router = express.Router();
    router.all('*', (req, res) => {
      res.status(500).json({
        error: true,
        message: `Route module '${name}' failed to load`
      });
    });
    return router;
  }
};

// Load routes
const agentsRoutes = loadRoute('agents');
const metricsRoutes = loadRoute('metrics');
const settingsRoutes = loadRoute('settings');
const toolsRoutes = loadRoute('tools');
const workflowsRoutes = loadRoute('workflows');
const uplinkRoutes = loadRoute('uplink');
const backupRoutes = loadRoute('backup');
const configRoutes = loadRoute('config');

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

// API versioning (v1)
const v1Router = express.Router();

// Mount API routes on v1 router
v1Router.use('/agents', agentsRoutes);
v1Router.use('/metrics', metricsRoutes); 
v1Router.use('/settings', settingsRoutes);
v1Router.use('/tools', toolsRoutes);
v1Router.use('/workflows', workflowsRoutes);
v1Router.use('/uplink', uplinkRoutes);
v1Router.use('/backup', backupRoutes);
v1Router.use('/config', configRoutes);

// Mount v1 router
router.use('/v1', v1Router);

// For backward compatibility, mount routes directly as well
router.use('/agents', agentsRoutes);
router.use('/metrics', metricsRoutes); 
router.use('/settings', settingsRoutes);
router.use('/tools', toolsRoutes);
router.use('/workflows', workflowsRoutes);
router.use('/uplink', uplinkRoutes);
router.use('/config', configRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
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
