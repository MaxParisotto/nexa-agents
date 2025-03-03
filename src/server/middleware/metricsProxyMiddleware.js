/**
 * Middleware for proxying metrics requests
 */

import logger from '../utils/logger.js';

export const metricsProxyMiddleware = (req, res, next) => {
  logger.debug(`Metrics proxy request: ${req.method} ${req.originalUrl}`);
  
  // Add metrics-specific headers
  res.setHeader('X-Metrics-Proxy', 'true');
  
  next();
};