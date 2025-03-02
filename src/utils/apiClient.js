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

// Define API methods with fallbacks
const apiClient = {
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
