/**
 * Backend logger utility based on Winston
 * Handles logging to console and files with proper formatting
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Create logs directory if it doesn't exist
const LOGS_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '../../../logs');
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Define log formats
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

// Create logger with console and file transports
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: fileFormat,
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: consoleFormat
    }),
    // Info log file
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'info.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(LOGS_DIR, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add request logging with rate limiting to prevent log spam
const requestLogCache = new Map();

// Helper function to clean up expired cache entries
const cleanupRequestCache = () => {
  const now = Date.now();
  let expiredCount = 0;
  
  requestLogCache.forEach((timestamp, key) => {
    // Remove entries older than 5 minutes
    if (now - timestamp > 300000) {
      requestLogCache.delete(key);
      expiredCount++;
    }
  });
  
  if (expiredCount > 0) {
    logger.debug(`Cleaned up ${expiredCount} expired log cache entries`);
  }
};

// Set up cache cleanup interval
setInterval(cleanupRequestCache, 60000); // Run every minute

// Export the configured logger
export default logger;
