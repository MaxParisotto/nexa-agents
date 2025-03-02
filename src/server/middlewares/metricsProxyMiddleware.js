import axios from 'axios';
import logger from '../utils/logger.js';
import os from 'os';

// Metrics service URL
const METRICS_SERVICE_URL = process.env.METRICS_SERVICE_URL || 'http://localhost:3005';

// Flag to track if we've detected the metrics service is available
let metricsServiceAvailable = null; // null = not checked yet
let lastCheckTime = 0;

// Simple fallback metrics generator
const getFallbackMetrics = () => {
  return {
    cpu: {
      usage: Math.random() * 20 + 10, // Random between 10-30%
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown'
    },
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
    },
    uptime: Math.floor(os.uptime()),
    serverUptime: Math.floor(process.uptime()),
    timestamp: Date.now()
  };
};

const getFallbackTokenMetrics = () => {
  return {
    totalProcessed: 0,
    inputTokens: 0,
    outputTokens: 0,
    byModel: {},
    timestamp: Date.now()
  };
};

// Check if the metrics service is available
const checkMetricsService = async () => {
  // Only check once per minute
  const now = Date.now();
  if (metricsServiceAvailable !== null && now - lastCheckTime < 60000) {
    return metricsServiceAvailable;
  }
  
  try {
    const response = await axios.get(`${METRICS_SERVICE_URL}/metrics`, {
      timeout: 500 // Short timeout
    });
    
    metricsServiceAvailable = response.status === 200;
    lastCheckTime = now;
    
    if (metricsServiceAvailable) {
      logger.info('Metrics service is available');
    }
    
    return metricsServiceAvailable;
  } catch (error) {
    metricsServiceAvailable = false;
    lastCheckTime = now;
    logger.warn('Metrics service is not available, using fallback');
    return false;
  }
};

/**
 * Proxy middleware for metrics requests
 * This will forward requests to the dedicated metrics service
 * or respond with fallback data if the service is unavailable
 */
export const metricsProxyMiddleware = async (req, res, next) => {
  // Only handle metrics routes
  if (!req.path.startsWith('/api/metrics')) {
    return next();
  }
  
  // Special case for basic system metrics
  if (req.path === '/api/metrics' || req.path === '/api/metrics/system') {
    // Check if metrics service is available
    const serviceAvailable = await checkMetricsService();
    
    if (!serviceAvailable) {
      // Send fallback metrics
      console.log('📊 Returning fallback metrics');
      return res.json(getFallbackMetrics());
    }
  }
  
  // Special case for token metrics
  if (req.path === '/api/metrics/tokens' && req.method === 'GET') {
    // Check if metrics service is available
    const serviceAvailable = await checkMetricsService();
    
    if (!serviceAvailable) {
      // Send fallback metrics
      console.log('📊 Returning fallback token metrics');
      return res.json(getFallbackTokenMetrics());
    }
  }
  
  try {
    console.log(`📊 Proxying metrics request: ${req.method} ${req.path}`);
    
    // Extract the metrics-specific path
    const metricsPath = req.path.replace('/api/metrics', '/metrics');
    const url = `${METRICS_SERVICE_URL}${metricsPath}`;
    
    // Create correct request configuration
    const config = {
      method: req.method,
      url,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // Include body for POST/PUT requests
      ...(req.method !== 'GET' && req.method !== 'DELETE' ? { data: req.body } : {})
    };
    
    // Make request to metrics service
    const response = await axios(config);
    
    // Forward the response status and data
    return res
      .status(response.status)
      .json(response.data);
    
  } catch (error) {
    logger.error('Error proxying to metrics service:', error.message);
    
    // If metrics service is unreachable, return a formatted error
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      metricsServiceAvailable = false; // Update status
      
      // For GET requests, provide fallback data based on the endpoint
      if (req.method === 'GET') {
        if (req.path === '/api/metrics' || req.path === '/api/metrics/system') {
          return res.json(getFallbackMetrics());
        }
        
        if (req.path === '/api/metrics/tokens') {
          return res.json(getFallbackTokenMetrics());
        }
      }
      
      return res.status(503).json({
        error: 'Metrics service unavailable',
        message: 'The metrics service is currently offline. Using fallback metrics.',
        timestamp: Date.now()
      });
    }
    
    // Forward error response if available
    if (error.response) {
      return res
        .status(error.response.status)
        .json(error.response.data);
    }
    
    // Generic error response
    return res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message,
      timestamp: Date.now()
    });
  }
};
