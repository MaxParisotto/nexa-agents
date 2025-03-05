const logService = require('../../services/logService');

function performanceMonitor(req, res, next) {
  const endTimer = logService.performance.measure('request', {
    path: req.path,
    method: req.method
  });

  // Track response time
  res.on('finish', () => {
    endTimer();
  });

  // Memory snapshot every 100 requests (adjust as needed)
  if (Math.random() < 0.01) { // 1% of requests
    logService.memory.snapshot();
  }

  next();
}

module.exports = performanceMonitor;
