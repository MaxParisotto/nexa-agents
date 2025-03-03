/**
 * Debug middleware to log API requests and responses
 */
export const debugApiRequests = (req, res, next) => {
  // Only log API requests in non-production environments
  if (process.env.NODE_ENV !== 'production' && req.path.startsWith('/api/')) {
    const start = Date.now();
    console.log(`📥 API Request: ${req.method} ${req.path}`);
    
    // Save the original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    const originalEnd = res.end;
    
    // Override send method to log response
    res.send = function(body) {
      const duration = Date.now() - start;
      
      // Log response summary
      console.log(`📤 API Response: ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
      
      // Check for common issues
      if (typeof body === 'string' && (body.includes('<!DOCTYPE') || body.includes('<html'))) {
        console.error(`❌ WARNING: HTML response detected for API route ${req.path}`);
      }
      
      // Continue with the original method
      return originalSend.apply(this, arguments);
    };
    
    // Override json method to log response
    res.json = function(body) {
      const duration = Date.now() - start;
      console.log(`📤 API JSON Response: ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
      return originalJson.apply(this, arguments);
    };
    
    // Override end method to log response
    res.end = function(chunk) {
      const duration = Date.now() - start;
      console.log(`📤 API End: ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
      return originalEnd.apply(this, arguments);
    };
  }
  
  next();
};
