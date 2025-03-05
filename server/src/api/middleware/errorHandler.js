/**
 * Centralized error handler
 */
const logger = require('../../utils/logger').createLogger('errorHandler');

// Error handler middleware
module.exports = (err, req, res, next) => {
  // Log the error
  logger.error('API Error:', {
    message: err.message,
    path: req.path,
    method: req.method
  });
  
  // Default status and message
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  // Send the response based on the type of error
  res.status(status).json({
    error: true,
    message,
    path: req.path,
    timestamp: new Date().toISOString()
  });
};
