const networkMetrics = require('../../services/metrics/networkMetrics');

function networkTracker(req, res, next) {
    const startTime = process.hrtime();
    const startBytes = parseInt(req.headers['content-length'] || 0);

    // Track request
    networkMetrics.trackRequest(
        req.path,
        req.method,
        Date.now(),
        startBytes
    );

    // Track response
    const originalWrite = res.write;
    const originalEnd = res.end;
    let bytesWritten = 0;

    res.write = function(chunk, ...args) {
        if (chunk) {
            bytesWritten += chunk.length;
        }
        originalWrite.apply(res, [chunk, ...args]);
    };

    res.end = function(chunk, ...args) {
        if (chunk) {
            bytesWritten += chunk.length;
        }

        // Calculate duration
        const duration = process.hrtime(startTime);
        const durationMs = duration[0] * 1000 + duration[1] / 1e6;

        // Track response metrics
        networkMetrics.trackResponse(bytesWritten, res.statusCode, durationMs);

        originalEnd.apply(res, [chunk, ...args]);
    };

    next();
}

module.exports = networkTracker;
