/**
 * Backend logger utility based on Winston
 * Handles logging to console and files with proper formatting
 */

const winston = require("winston");
const path = require("path");
const fs = require("fs");
const { fileURLToPath } = require("url");

// Get the directory name for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? 
      JSON.stringify(meta, (key, value) => {
        // Handle circular references
        if (key && typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      }, 2) : '';
    seen = new Set(); // Reset for next use
    return `${timestamp} ${level}: ${message} ${metaStr}`;
  })
);

// Set to handle circular references
let seen = new Set();

// Create logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: customFormat,
  transports: [
    // Console output with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length && !meta.silent ? 
            ('\n' + JSON.stringify(meta, null, 2)) : '';
          return `${timestamp} ${level}: ${message}${metaStr}`;
        })
      )
    }),
    // Error logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // All logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5242880, // 5MB,
      maxFiles: 5,
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5242880, // 5MB,
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

module.exports = logger;
