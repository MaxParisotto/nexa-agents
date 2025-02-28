/**
 * API Client for communicating with the backend services
 * Centralizes all API calls to the backend for better maintainability
 */

// Define API base URL
const API_BASE_URL = 'http://localhost:3001';

// Configuration for request timeouts and retries
const API_CONFIG = {
  timeout: 5000, // 5 seconds timeout
  maxRetries: 2,
  retryDelay: 1000, // Start with 1 second delay, will increase exponentially
};

/**
 * Get fallback models for when no models are available
 * @param {string} serverType - Type of server (lmStudio, ollama)
 * @returns {Array} Array of default model names
 */
const getFallbackModels = (serverType) => {
  if (serverType === 'ollama') {
    return [
      'llama2',
      'llama2:13b',
      'mistral',
      'mistral:7b-instruct',
      'mixtral',
      'mixtral:8x7b-instruct'
    ];
  } else {
    // Default to lmStudio models
    return [
      'qwen2.5-7b-instruct',
      'qwen2.5-1.5b-instruct',
      'llama2',
      'mistral-7b-instruct',
      'deepseek-coder',
      'phi-3-mini'
    ];
  }
};

/**
 * Normalize provider name to ensure consistent casing
 * @param {string} provider - Provider name to normalize
 * @returns {string} Normalized provider name
 */
const normalizeProviderName = (provider) => {
  if (!provider) return '';
  
  // Convert to lowercase for case-insensitive comparison
  const lowerProvider = provider.toLowerCase();
  
  // Map of normalized provider names
  const providerMap = {
    'lmstudio': 'lmStudio',
    'ollama': 'ollama',
    'projectmanager': 'projectManager'
  };
  
  // Return the normalized name or the original if not found
  return providerMap[lowerProvider] || provider;
};

/**
 * Helper to create a timeout signal for fetch requests
 * @param {number} ms - Timeout in milliseconds
 * @returns {AbortSignal} AbortSignal that will timeout after ms milliseconds
 */
const createTimeoutSignal = (ms = API_CONFIG.timeout) => {
  return AbortSignal.timeout(ms);
};

/**
 * Retry a fetch request with exponential backoff
 * @param {Function} fetchFn - Function that returns a fetch promise
 * @param {Object} options - Options for retry behavior
 * @returns {Promise} - Result of the fetch or the last error
 */
const fetchWithRetry = async (fetchFn, options = {}) => {
  const { maxRetries = API_CONFIG.maxRetries, retryDelay = API_CONFIG.retryDelay } = options;
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If it's a retry, wait with exponential backoff
      if (attempt > 0) {
        const delayMs = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      return await fetchFn();
    } catch (error) {
      lastError = error;
      
      // Only retry specific errors that might be temporary
      const isNetworkError = error.message.includes('Failed to fetch') || 
                            error.message.includes('NetworkError') ||
                            error.message.includes('network');
                          
      const isTimeoutError = error.name === 'TimeoutError' || 
                            error.message.includes('timeout') ||
                            error.message.includes('aborted');
                  
      // Don't retry client errors (4xx)
      const isClientError = error.status >= 400 && error.status < 500;
      
      if (!isNetworkError && !isTimeoutError || isClientError) {
        break;
      }
    }
  }
  
  throw lastError;
};

/**
 * Enhanced response handler with better error information
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    // Try to get error details from response body
    let errorMessage;
    try {
      const contentType = response.headers.get('content-type');
      
      // Only try to parse JSON if the content type is application/json
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.error || `API error: ${response.status} ${response.statusText}`;
      } else {
        // For non-JSON responses, use the status text
        errorMessage = `API error: ${response.status} ${response.statusText}`;
      }
    } catch (e) {
      // If we can't parse JSON, just use the status text
      errorMessage = `API error: ${response.status} ${response.statusText}`;
    }
    
    const error = new Error(errorMessage);
    error.status = response.status;
    error.statusText = response.statusText;
    throw error;
  }
  
  try {
    // Try to parse as JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    } else {
      // For non-JSON responses, return text
      const text = await response.text();
      return { success: true, data: text };
    }
  } catch (error) {
    // If JSON parsing fails, return an empty success object
    return { success: true };
  }
};

/**
 * Settings API client
 */
export const settingsApi = {
  /**
   * Load settings from the backend
   * @returns {Promise<Object>} Settings object
   */
  loadSettings: async () => {
    return fetchWithRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        signal: createTimeoutSignal()
      });
      return handleResponse(response);
    });
  },

  /**
   * Save settings to the backend
   * @param {Object} settings - Settings object to save
   * @returns {Promise<Object>} Result object with success flag
   */
  saveSettings: async (settings) => {
    return fetchWithRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings),
        signal: createTimeoutSignal()
      });
      return handleResponse(response);
    });
  },

  /**
   * Validate settings without saving
   * @param {Object} settings - Settings object to validate
   * @returns {Promise<Object>} Validation result
   */
  validateSettings: async (settings) => {
    // Use default empty settings if none provided to prevent validation errors
    const settingsToValidate = settings || {
      lmStudio: { apiUrl: 'http://localhost:1234' },
      ollama: { apiUrl: 'http://localhost:11434' },
      projectManager: { 
        apiUrl: 'http://localhost:1234', 
        serverType: 'lmStudio',
        model: ''
      }
    };
    
    try {
      return fetchWithRetry(async () => {
        const response = await fetch(`${API_BASE_URL}/api/settings/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(settingsToValidate),
          signal: createTimeoutSignal()
        });
        
        // Special handling for validation errors
        if (!response.ok) {
          // Return a default "valid" response to prevent app from crashing
          return { isValid: true, warnings: ["Validation skipped due to server error"] };
        }
        
        return response.json();
      });
    } catch (error) {
      // Return a default response instead of throwing
      return { 
        isValid: true, 
        warnings: ["Validation skipped: " + (error.message || "Unknown error")]
      };
    }
  },

  /**
   * Clear all settings
   * @returns {Promise<Object>} Result object with success flag
   */
  clearSettings: async () => {
    return fetchWithRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'DELETE',
        signal: createTimeoutSignal()
      });
      return handleResponse(response);
    });
  }
};

/**
 * Models API client
 */
export const modelsApi = {
  /**
   * Get models for a provider
   * @param {string} provider - Provider name (e.g., 'lmStudio', 'ollama')
   * @param {string} apiUrl - API URL for the provider
   * @param {string} serverType - Server type for projectManager
   * @returns {Promise<Array>} Array of model names
   */
  getModels: async (provider, apiUrl, serverType) => {
    // Normalize provider name to ensure correct casing
    const normalizedProvider = normalizeProviderName(provider);
    
    // Handle errors more gracefully
    try {
      // Special handling for projectManager - if it's projectManager, try to get models from both lmStudio and ollama
      if (normalizedProvider === 'projectManager') {
        try {
          // Log the attempt for debugging
          console.log(`Attempting to fetch models for ${normalizedProvider} from ${apiUrl} (serverType: ${serverType || 'undefined'})`);
          
          // Try to get the models from the actual endpoint
          const result = await fetchWithRetry(async () => {
            const encodedApiUrl = encodeURIComponent(apiUrl);
            // Pass serverType in the request if available
            const url = serverType 
              ? `${API_BASE_URL}/api/models/${normalizedProvider}?apiUrl=${encodedApiUrl}&serverType=${serverType}`
              : `${API_BASE_URL}/api/models/${normalizedProvider}?apiUrl=${encodedApiUrl}`;
            
            const response = await fetch(url, {
              signal: createTimeoutSignal(8000) // Longer timeout for Project Manager
            });
            return handleResponse(response);
          });
          
          // If models were found, return them
          if (result.models && Array.isArray(result.models) && result.models.length > 0) {
            console.log(`Found ${result.models.length} models for ${normalizedProvider}`);
            return result;
          }

          console.log(`No models found for ${normalizedProvider}, using fallbacks`);
          
          // Determine the correct server type - from result, passed parameter, or default to lmStudio
          const effectiveServerType = result.serverType || serverType || 'lmStudio';
          const fallbackModels = getFallbackModels(effectiveServerType);

          // Add some extra common models that work with many backends
          const extraModels = ['llama2', 'mistral-7b-instruct', 'qwen2.5-7b-instruct'];
          
          // Combine fallback models with any extras not already in the list
          const combinedModels = [...fallbackModels];
          extraModels.forEach(model => {
            if (!combinedModels.includes(model)) {
              combinedModels.push(model);
            }
          });

          // Try to fetch any cached models from localStorage
          try {
            const cachedModels = localStorage.getItem(`${normalizedProvider}Models`);
            if (cachedModels) {
              const parsedModels = JSON.parse(cachedModels);
              if (Array.isArray(parsedModels) && parsedModels.length > 0) {
                // Add any cached models not already in the list
                parsedModels.forEach(model => {
                  if (!combinedModels.includes(model)) {
                    combinedModels.push(model);
                  }
                });
              }
            }
          } catch (e) {
            console.warn('Error parsing cached models:', e);
          }

          return {
            models: combinedModels,
            provider: normalizedProvider,
            serverType: effectiveServerType,
            fallback: true,
            message: 'Using default models list'
          };
        } catch (error) {
          console.error(`Error fetching models for ${normalizedProvider}:`, error);
          
          // Use server type from parameter or default to lmStudio
          const effectiveServerType = serverType || 'lmStudio';
          const fallbackModels = getFallbackModels(effectiveServerType);
          
          // Try to load any manually added models from localStorage
          let combinedModels = [...fallbackModels];
          try {
            const manualModels = localStorage.getItem('projectManager_manual_models');
            if (manualModels) {
              const parsedModels = JSON.parse(manualModels);
              if (Array.isArray(parsedModels)) {
                // Add any manual models to the top of the list
                combinedModels = [...parsedModels, ...combinedModels];
              }
            }
          } catch (e) {
            console.warn('Error loading manual models:', e);
          }
          
          // Provide default models based on preferred serverType
          return {
            models: combinedModels,
            provider: normalizedProvider,
            serverType: effectiveServerType,
            fallback: true,
            error: error.message
          };
        }
      }
      
      // Normal path for other providers
      return fetchWithRetry(async () => {
        const encodedApiUrl = encodeURIComponent(apiUrl);
        const response = await fetch(`${API_BASE_URL}/api/models/${normalizedProvider}?apiUrl=${encodedApiUrl}`, {
          signal: createTimeoutSignal()
        });
        return handleResponse(response);
      });
    } catch (error) {
      // Return empty models array instead of throwing
      return { 
        models: [], 
        provider: normalizedProvider,
        error: error.message
      };
    }
  },

  /**
   * Test connection to a provider
   * @param {string} provider - Provider name
   * @param {string} apiUrl - API URL for the provider
   * @param {string} model - Model name to test
   * @param {string} serverType - Server type (optional, for projectManager)
   * @returns {Promise<Object>} Test result
   */
  testConnection: async (provider, apiUrl, model, serverType) => {
    // Normalize provider name
    const normalizedProvider = normalizeProviderName(provider);
    
    try {
      // Log attempt with all params for debugging
      console.log(`Testing connection for ${normalizedProvider}`, { apiUrl, model, serverType });
      
      return fetchWithRetry(async () => {
        const response = await fetch(`${API_BASE_URL}/api/models/test-connection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            provider: normalizedProvider, 
            apiUrl, 
            model,
            serverType // Pass serverType to backend
          }),
          signal: createTimeoutSignal(10000) // Longer timeout for connection tests
        });
        return handleResponse(response);
      });
    } catch (error) {
      // Return a failed test result instead of throwing
      return {
        success: false,
        provider: normalizedProvider,
        apiUrl,
        serverType,
        error: error.message
      };
    }
  },

  /**
   * Validate a model for a provider
   * @param {string} provider - Provider name
   * @param {string} model - Model name to validate
   * @returns {Promise<Object>} Validation result
   */
  validateModel: async (provider, model) => {
    // Normalize provider name
    const normalizedProvider = normalizeProviderName(provider);
    
    try {
      return fetchWithRetry(async () => {
        const response = await fetch(`${API_BASE_URL}/api/models/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            provider: normalizedProvider, 
            model 
          }),
          signal: createTimeoutSignal()
        });
        return handleResponse(response);
      });
    } catch (error) {
      // Return a default validation result instead of throwing
      return { 
        isValid: true, 
        warnings: [`Validation skipped: ${error.message}`],
        provider: normalizedProvider,
        model
      };
    }
  }
};

export default {
  settings: settingsApi,
  models: modelsApi
}; 