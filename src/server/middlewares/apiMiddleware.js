/**
 * Middleware to ensure proper content types for API responses
 */
export const ensureJsonResponses = (req, res, next) => {
  // Only apply to API routes
  if (req.path.startsWith('/api/')) {
    // Set proper content type for all API responses
    res.setHeader('Content-Type', 'application/json');
    
    // Store original send method
    const originalSend = res.send;
    
    // Override send method to ensure JSON responses
    res.send = function(body) {
      // If body is not a string yet or is already JSON string, we're good
      if (typeof body !== 'string' || (body.startsWith('{') && body.endsWith('}')) ||
          (body.startsWith('[') && body.endsWith(']'))) {
        return originalSend.call(this, body);
      }
      
      // If not JSON, convert to JSON error
      console.warn(`API route ${req.path} tried to send non-JSON response`);
      const jsonError = JSON.stringify({ 
        error: 'Invalid response format',
        message: 'API endpoint returned non-JSON data'
      });
      
      this.setHeader('Content-Type', 'application/json');
      return originalSend.call(this, jsonError);
    };
  }
  
  next();
};
