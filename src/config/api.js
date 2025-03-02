/**
 * API Configuration
 */

// Determine the API base URL based on environment
const getApiBaseUrl = () => {
  // For production or when using the proxy, use the Rust proxy server
  if (process.env.NODE_ENV === 'production' || process.env.API_PROXY_ENABLED === 'true') {
    return process.env.API_PROXY_URL || 'http://localhost:3005';
  }
  
  // For development without proxy, use the direct Node.js backend
  return process.env.API_URL || 'http://localhost:3001';
};

export const API_BASE_URL = getApiBaseUrl();

// Default API timeout in milliseconds
export const API_TIMEOUT = 30000;

// API endpoints
export const API_ENDPOINTS = {
  // Metrics endpoints
  METRICS: '/api/metrics',
  METRICS_SYSTEM: '/api/metrics/system',
  METRICS_TOKENS: '/api/metrics/tokens',
  METRICS_TRAFFIC: '/api/metrics/traffic',
  
  // Add other endpoints as needed...
};

export default {
  BASE_URL: API_BASE_URL,
  TIMEOUT: API_TIMEOUT,
  ENDPOINTS: API_ENDPOINTS,
};
