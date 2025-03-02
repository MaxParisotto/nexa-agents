import axios from 'axios';

// Create base axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Enhanced fetch with retry mechanism and fallbacks
 * @param {Function} apiCall - The API call function to execute
 * @param {Object} options - Options for the fetch operation
 * @returns {Promise<Object>} The API response or fallback data
 */
const fetchWithRetry = async (apiCall, options = {}) => {
  const {
    retries = 1,
    retryDelay = 1000,
    fallbackData = null,
    silentFallback = false,
    timeout = 5000,
    logErrors = true
  } = options;
  
  let lastError;
  
  // Try the API call with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Set a timeout for this specific request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await apiCall({ 
        signal: controller.signal,
        headers: {
          // Add cache-busting for development
          ...(process.env.NODE_ENV !== 'production' ? 
            { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } : {})
        }
      });
      
      clearTimeout(timeoutId);
      return response.data;
    } catch (error) {
      lastError = error;
      
      if (logErrors) {
        console.warn(`API request failed (attempt ${attempt + 1}/${retries + 1}):`, error.message);
      }
      
      // Don't retry if we've reached the maximum attempts
      if (attempt === retries) break;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  // If we got here, all attempts failed
  if (!silentFallback) {
    console.error('All API requests failed, using fallback data:', lastError?.message);
  }
  
  // Return fallback data
  return fallbackData;
};

/**
 * API client to handle frontend to backend requests with error handling
 */
const API_URL = process.env.NODE_ENV === 'production' 
  ? window.location.origin
  : 'http://localhost:3001';

// Add a timeout to all fetch requests
const fetchWithTimeout = (url, options = {}, timeout = 5000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
};

/**
 * Handle API response with better error checking
 */
const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type');
  
  if (!response.ok) {
    // If response is not OK, try to extract error message, then throw
    let errorMessage;
    try {
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || `${response.status}: ${response.statusText}`;
      } else {
        errorMessage = `${response.status}: ${response.statusText}`;
      }
    } catch (e) {
      errorMessage = `${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  
  // Return different types of responses based on content type
  if (contentType && contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      throw new Error('Invalid JSON response from server');
    }
  } else if (contentType && contentType.includes('text/')) {
    return response.text();
  } else {
    return response;
  }
};

/**
 * API client with dedicated methods for each API area
 */
const apiClient = {
  // System metrics endpoints
  metrics: {
    // Get system metrics with fallback
    async getMetrics() {
      try {
        // Try to use the preferred API path with proxy
        const response = await fetchWithTimeout('/api/metrics');
        return await handleResponse(response);
      } catch (error) {
        console.warn('Error fetching metrics through proxy, trying direct URL:', error);
        try {
          // Fallback to direct URL if proxy fails
          const response = await fetchWithTimeout(`${API_URL}/api/metrics`);
          return await handleResponse(response);
        } catch (fallbackError) {
          console.error('Both metrics fetch attempts failed:', fallbackError);
          throw fallbackError;
        }
      }
    },
    
    // Get token metrics with fallback
    async getTokenMetrics() {
      try {
        // Try to use the preferred API path with proxy
        const response = await fetchWithTimeout('/api/metrics/tokens');
        return await handleResponse(response);
      } catch (error) {
        console.warn('Error fetching token metrics through proxy, trying direct URL:', error);
        try {
          // Fallback to direct URL if proxy fails
          const response = await fetchWithTimeout(`${API_URL}/api/metrics/tokens`);
          return await handleResponse(response);
        } catch (fallbackError) {
          console.error('Both token metrics fetch attempts failed:', fallbackError);
          throw fallbackError;
        }
      }
    }
  },
  
  // Add other API endpoints here...
  status: {
    async getStatus() {
      try {
        const response = await fetchWithTimeout('/api/status');
        return await handleResponse(response);
      } catch (error) {
        console.warn('Error getting status through proxy, trying direct URL');
        try {
          const response = await fetchWithTimeout(`${API_URL}/api/status`);
          return await handleResponse(response);
        } catch (fallbackError) {
          return { online: false, error: fallbackError.message };
        }
      }
    }
  },

  // Settings
  settings: {
    loadSettings: async () => {
      const fallbackData = {
        general: JSON.parse(localStorage.getItem('generalSettings') || '{}'),
        lmStudio: {
          apiUrl: localStorage.getItem('lmStudioAddress') || 'http://localhost:1234',
          defaultModel: localStorage.getItem('defaultLmStudioModel') || '',
          models: JSON.parse(localStorage.getItem('lmStudioModels') || '[]')
        },
        ollama: {
          apiUrl: localStorage.getItem('ollamaAddress') || 'http://localhost:11434',
          defaultModel: localStorage.getItem('defaultOllamaModel') || '',
          models: JSON.parse(localStorage.getItem('ollamaModels') || '[]')
        },
        features: JSON.parse(localStorage.getItem('featureSettings') || '{}'),
        // Use empty data as fallback for anything else
      };
      
      return fetchWithRetry(
        (config) => api.get('/settings', config),
        { 
          fallbackData,
          silentFallback: true,
          retries: 0 // Only try once for the initial load
        }
      );
    },
    
    // Other settings methods...
  },
  
  // Test endpoints
  test: {
    ping: async () => {
      return fetchWithRetry(
        (config) => api.get('/test/ping', config),
        { 
          fallbackData: { success: false, message: 'Server is offline' },
          silentFallback: true,
          retries: 0
        }
      );
    },
    
    // Other test methods...
  },
  
  // Server status
  status: {
    getStatus: async () => {
      // Try the dedicated status endpoint first
      try {
        const response = await fetchWithRetry(
          (config) => api.get('/status', { ...config, timeout: 2000 }),
          {
            retries: 0,
            silentFallback: true,
            timeout: 2000
          }
        );
        
        // If we get here, server is online
        return {
          online: true,
          ...response
        };
      } catch (error) {
        // If the status endpoint fails, try a simpler ping endpoint
        try {
          const pingResponse = await fetchWithRetry(
            (config) => api.get('/test/ping', { ...config, timeout: 2000 }),
            {
              retries: 0,
              silentFallback: true,
              timeout: 2000
            }
          );
          
          if (pingResponse?.success) {
            return {
              online: true,
              message: 'Server is online (minimal status)',
              services: {}
            };
          }
        } catch (innerError) {
          // Both endpoints failed
          console.log('Both status checks failed:', error.message, innerError?.message);
        }
        
        // Return offline status
        return {
          online: false,
          services: {},
          message: 'Server is offline or unreachable'
        };
      }
    }
  }
};

export default apiClient;
