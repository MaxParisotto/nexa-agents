/**
 * Backend logger utility based on Winston
 * Handles logging to console and files with proper formatting
 */

const winston = require("winston");
const path = require("path");
const fs = require("fs");

// Define logs directory relative to data directory
const DATA_DIR = path.join(__dirname, '../../../data');
const LOGS_DIR = path.join(DATA_DIR, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Set to handle circular references
let seen = new Set();

// Define custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, label, ...meta }) => {
    const prefix = label ? `[${label}] ` : '';
    const metaStr = Object.keys(meta).length ? 
      JSON.stringify(meta, (key, value) => {
        if (key && typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }, 2) : '';
    seen = new Set();
    return `${timestamp} ${level}: ${prefix}${message} ${metaStr}`;
  })
);

// Create default logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: customFormat,
  transports: [
    // Console output with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, label, ...meta }) => {
          const prefix = label ? `[${label}] ` : '';
          const metaStr = Object.keys(meta).length && !meta.silent ? 
            ('\n' + JSON.stringify(meta, null, 2)) : '';
          return `${timestamp} ${level}: ${prefix}${message}${metaStr}`;
        })
      )
    }),
    // Error logs
    new winston.transports.File({ 
      filename: path.join(LOGS_DIR, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // All logs
    new winston.transports.File({ 
      filename: path.join(LOGS_DIR, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Socket.IO specific logs
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'socket.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        customFormat,
        winston.format.label({ label: 'socket.io' })
      )
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(LOGS_DIR, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(LOGS_DIR, 'rejections.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

// Add a stream for Morgan HTTP logging middleware
logger.stream = {
  write: function(message) {
    logger.info(message.trim());
  }
};

// Function to create a logger with a specific label
const createLogger = (label) => {
  return logger.child({ label });
};

// Export both the default logger and the createLogger function
module.exports = logger;
module.exports.createLogger = createLogger;
