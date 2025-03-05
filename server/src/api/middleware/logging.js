/**
 * API logging middleware
 */
const logger = require('../../utils/logger').createLogger('api');

exports.apiLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request details
  logger.debug(`${req.method} ${req.originalUrl}`);
  
  // Add response finished listener
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[level](
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });
  
  next();
};
