import { createLogger } from '../utils/logger.js';

export function ensureJsonResponses(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  next();
}

export function errorHandler(err, req, res, next) {
  const logger = createLogger('apiMiddleware');
  logger.error(`API Error: ${err.message}`);
  
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      code: err.code || 'INTERNAL_ERROR'
    }
  });
}

export function requestLogger(req, res, next) {
  const logger = createLogger('apiMiddleware');
  logger.debug(`${req.method} ${req.originalUrl}`);
  next();
}