import axios from 'axios';

// Create a base axios instance with more reasonable timeout
const api = axios.create({
  baseURL: '/api',
  timeout: 5000, // Reduced from 10000 to 5000 for faster feedback
  headers: {
    'Content-Type': 'application/json',
  }
});

// Store abort controllers for ongoing requests
const controllers = new Map();

// Create a request registry to track latency/status for monitoring
export const requestRegistry = {
  // Format: endpoint -> { lastStatus, lastLatency, lastChecked, errorCount }
  endpoints: new Map(),
  
  // Register request attempt
  registerRequest(endpoint) {
    if (!this.endpoints.has(endpoint)) {
      this.endpoints.set(endpoint, {
        lastStatus: null,
        lastLatency: null,
        lastChecked: null,
        errorCount: 0,
        successCount: 0
      });
    }
    return performance.now();
  },
  
  // Register successful response
  registerSuccess(endpoint, startTime) {
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);
    
    const info = this.endpoints.get(endpoint) || {
      errorCount: 0,
      successCount: 0
    };
    
    this.endpoints.set(endpoint, {
      lastStatus: 'success',
      lastLatency: latency,
      lastChecked: new Date(),
      errorCount: info.errorCount,
      successCount: info.successCount + 1
    });
    
    return latency;
  },
  
  // Register error
  registerError(endpoint, error) {
    const info = this.endpoints.get(endpoint) || {
      lastLatency: null,
      lastChecked: null,
      errorCount: 0,
      successCount: 0
    };
    
    this.endpoints.set(endpoint, {
      lastStatus: 'error',
      lastLatency: info.lastLatency,
      lastChecked: new Date(),
      errorCount: info.errorCount + 1,
      successCount: info.successCount,
      lastError: error
    });
  },
  
  // Get metrics for all endpoints
  getMetrics() {
    return Array.from(this.endpoints.entries()).map(([endpoint, stats]) => ({
      endpoint,
      ...stats
    }));
  }
};

// Helper function for requests with proper cleanup and monitoring
export const fetchWithRetry = async (url, options = {}) => {
  const { method = 'GET', data, retry = 1, signal, timeout = 5000 } = options;
  
  // Create a controller for this request if not provided
  const controller = signal ? null : new AbortController();
  const requestSignal = signal || controller?.signal;
  
  // Store the controller with a unique ID
  const requestId = `${method}-${url}-${Date.now()}`;
  if (controller) {
    controllers.set(requestId, controller);
  }
  
  // Register the request attempt for monitoring
  const startTime = requestRegistry.registerRequest(url);
  
  try {
    // Make request with signal and specified timeout
    const response = await api.request({
      method,
      url,
      data,
      signal: requestSignal,
      timeout // Use the provided timeout
    });
    
    // Register successful response
    requestRegistry.registerSuccess(url, startTime);
    
    return response.data;
  } catch (error) {
    // Register the error
    requestRegistry.registerError(url, error);
    
    // Don't retry if request was aborted or canceled
    if (error.name === 'AbortError' || error.name === 'CanceledError' || axios.isCancel(error)) {
      console.log(`Request to ${url} was aborted`);
      throw new Error('request aborted');
    }
    
    if (retry > 0) {
      console.log(`Retrying request to ${url}, ${retry} attempts left`);
      return fetchWithRetry(url, { 
        ...options, 
        retry: retry - 1,
        timeout: Math.min(timeout * 1.5, 15000) // Increase timeout for retries but cap it
      });
    }
    
    console.error(`API request failed (attempt ${retry}/1):`, error.message);
    throw error;
  } finally {
    // Clean up the controller
    if (controller) {
      controllers.delete(requestId);
    }
  }
};

// Cleanup function to abort all ongoing requests
export const abortAllRequests = () => {
  controllers.forEach(controller => {
    try {
      controller.abort();
    } catch (e) {
      console.error('Error aborting request:', e);
    }
  });
  controllers.clear();
};

// Add convenience methods for common operations
const apiClient = {
  // Status endpoint
  status: {
    getStatus: () => fetchWithRetry('/status')
  },
  
  // Settings endpoints
  settings: {
    getSettings: () => fetchWithRetry('/settings'),
    updateSettings: (settings) => fetchWithRetry('/settings', { method: 'POST', data: settings }),
    verifyApiKey: (data) => fetchWithRetry('/settings/verify-api-key', { method: 'POST', data })
  },
  
  // Metrics endpoints with reduced timeout
  metrics: {
    getSystemMetrics: () => fetchWithRetry('/metrics/system', { timeout: 3000 }),
    getTokenMetrics: () => fetchWithRetry('/metrics/tokens', { timeout: 3000 })
  },
  
  // Models endpoints
  models: {
    getAvailableModels: () => fetchWithRetry('/models'),
    setDefaultModel: (modelId) => fetchWithRetry('/models/default', { method: 'POST', data: { modelId } }),
    updateModelSettings: (modelId, settings) => fetchWithRetry(`/models/${modelId}/settings`, { method: 'PUT', data: settings }),
    testModel: (modelId) => fetchWithRetry(`/models/${modelId}/test`, { method: 'POST' })
  }
};

export default apiClient;
