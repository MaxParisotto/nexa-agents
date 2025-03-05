const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger').createLogger('routes');

// Basic health check route
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Simple API routes
const routes = {
  agents: require('./agents'),
  metrics: require('./metrics'),
  settings: require('./settings'),
  tools: require('./tools'),
  workflows: require('./workflows'),
  uplink: require('./uplink'),
  backup: require('./backup'),
  config: require('./config')
};

// Mount each route module
Object.entries(routes).forEach(([name, handler]) => {
  try {
    router.use('/' + name, handler);
    logger.info(`Mounted route: ${name}`);
  } catch (err) {
    logger.warn(`Failed to mount route ${name}:`, err.message);
  }
});

// Basic error handler
router.use((err, req, res, next) => {
  logger.error('Route error:', err);
  res.status(500).json({
    error: true,
    message: 'Internal server error'
  });
});

module.exports = router;
