const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Define logs directory
const LOG_DIR = path.join(__dirname, '../../../data/logs');
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Custom format for structured logging
const structuredFormat = winston.format.printf(({ level, message, timestamp, service, ...metadata }) => {
  const meta = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
  return `${timestamp} [${service}] ${level}: ${message} ${meta}`;
});

// Create different transports for different log types
const transports = {
  console: new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      structuredFormat
    )
  }),
  error: new winston.transports.File({
    filename: path.join(LOG_DIR, 'error.log'),
    level: 'error',
    maxsize: MAX_LOG_SIZE,
    maxFiles: MAX_FILES
  }),
  api: new winston.transports.File({
    filename: path.join(LOG_DIR, 'api.log'),
    maxsize: MAX_LOG_SIZE,
    maxFiles: MAX_FILES
  }),
  performance: new winston.transports.File({
    filename: path.join(LOG_DIR, 'performance.log'),
    maxsize: MAX_LOG_SIZE,
    maxFiles: MAX_FILES
  }),
  security: new winston.transports.File({
    filename: path.join(LOG_DIR, 'security.log'),
    maxsize: MAX_LOG_SIZE,
    maxFiles: MAX_FILES
  })
};

// Create base logger
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'nexa-agents' },
  transports: Object.values(transports)
});

// Performance logging
const startTimer = () => {
  const start = process.hrtime();
  return () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    return seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
  };
};

// Add specialized logging methods
const logService = {
  info: (message, meta = {}) => logger.info(message, meta),
  error: (message, error, meta = {}) => {
    const errorMeta = {
      ...meta,
      stack: error?.stack,
      code: error?.code,
      name: error?.name
    };
    logger.error(message, errorMeta);
  },
  warn: (message, meta = {}) => logger.warn(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // API logging
  api: {
    request: (req, meta = {}) => {
      const end = startTimer();
      return () => {
        const duration = end();
        logger.info('API Request', {
          method: req.method,
          path: req.path,
          duration,
          ...meta
        });
      };
    }
  },

  // Performance logging
  performance: {
    measure: (operation, meta = {}) => {
      const end = startTimer();
      return () => {
        const duration = end();
        logger.info('Performance Measurement', {
          operation,
          duration,
          ...meta,
          timestamp: new Date().toISOString()
        });
      };
    }
  },

  // Security logging
  security: {
    audit: (event, meta = {}) => {
      logger.info('Security Audit', {
        event,
        ...meta,
        timestamp: new Date().toISOString()
      });
    }
  },

  // Memory usage logging
  memory: {
    snapshot: () => {
      const used = process.memoryUsage();
      logger.info('Memory Usage', {
        rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(used.external / 1024 / 1024)}MB`
      });
    }
  }
};

module.exports = logService;
