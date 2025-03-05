const metricsService = require('../../services/metrics');

function networkTracker(req, res, next) {
  const startTime = Date.now();
  const originalWrite = res.write;
  const originalEnd = res.end;
  let bytesWritten = 0;

  // Track request
  metricsService.networkMetrics.trackRequest(
    req.path,
    req.method,
    startTime,
    parseInt(req.headers['content-length'] || 0)
  );

  // Track response bytes
  res.write = function(chunk, ...args) {
    bytesWritten += chunk ? chunk.length : 0;
    originalWrite.apply(res, [chunk, ...args]);
  };

  res.end = function(chunk, ...args) {
    if (chunk) {
      bytesWritten += chunk.length;
    }
    metricsService.networkMetrics.trackResponse(bytesWritten);
    originalEnd.apply(res, [chunk, ...args]);
  };

  next();
}

module.exports = networkTracker;
