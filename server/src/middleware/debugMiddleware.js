/**
 * Debug middleware for logging API requests
 */

const logger = require("../utils/logger.js");

export const debugApiRequests = (req, res, next) => {
  logger.debug(`[${req.method}] ${req.originalUrl}`, {
    headers: req.headers,
    query: req.query,
    body: req.body,
    ip: req.ip
  });
  
  // Capture response details
  const originalSend = res.send;
  res.send = function(body) {
    logger.debug(`[${req.method}] ${req.originalUrl} -> ${res.statusCode}`, {
      response: body
    });
    originalSend.call(this, body);
  };
  
  next();
};