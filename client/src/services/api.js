import axios from 'axios';

// Get base URL from environment variable or use default
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Flag to control network request behavior
const NETWORK_CONFIG = {
  // Set to true to completely suppress actual network requests
  // This improves performance and prevents console errors when we know there's no backend
  OFFLINE_MODE: true,
  // Timeout for API requests (milliseconds)
  TIMEOUT: 2000,
  // Whether to log API info messages
  VERBOSE_LOGGING: false
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: NETWORK_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Silent error mode - prevents console error logs for expected 404s when backend is missing
const SILENT_ERRORS = true;

// Detect if a backend server is available - will be checked once and cached
let backendAvailable = null;

// Skip actual network check in OFFLINE_MODE
const checkBackendAvailability = async () => {
  if (NETWORK_CONFIG.OFFLINE_MODE) {
    if (NETWORK_CONFIG.VERBOSE_LOGGING) {
      console.log('Running in offline mode, assuming backend is unavailable');
    }
    return false;
  }

  if (backendAvailable !== null) return backendAvailable;
  
  try {
    await fetch(`${BASE_URL}/api/health`, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(1000) // Quick timeout
    });
    backendAvailable = true;
    console.log('Backend server is available');
  } catch (err) {
    backendAvailable = false;
    console.log('Backend server is not available, using local storage');
  }
  
  return backendAvailable;
};

// Advanced error handler that suppresses expected errors
const handleApiMethod = async (method, ...args) => {
  // Check if backend is available first to avoid unnecessary API calls
  const serverAvailable = await checkBackendAvailability();
  
  if (!serverAvailable) {
    // Return standardized error format without making the API call
    return Promise.reject({
      isServerUnavailable: true,
      message: "Backend server is not available"
    });
  }
  
  try {
    return await method(...args);
  } catch (error) {
    // Suppress the error from console if in silent mode
    if (SILENT_ERRORS) {
      // We can still log it as info instead of error
      console.info(`API request failed: ${error.message}`);
    } else {
      console.error('API Error:', error);
    }
    
    // Re-throw with additional context
    error.isHandled = true;
    throw error;
  }
};

// Request interceptor for API calls
apiClient.interceptors.request.use(
  async config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
apiClient.interceptors.response.use(
  response => response,
  async error => {
    // Don't try to handle errors if server is known to be unavailable
    if (backendAvailable === false) {
      return Promise.reject(error);
    }
    
    const originalRequest = error.config;
    
    // Handle token refresh or other auth errors here
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Handle token refresh
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await apiClient.post('/api/auth/refresh', { refreshToken });
          const { token } = response.data;
          localStorage.setItem('auth_token', token);
          return apiClient(originalRequest);
        }
      } catch (err) {
        // Redirect to login if token refresh fails
        console.error('Token refresh failed:', err);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        // window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Default settings to use when backend is unavailable
const DEFAULT_SETTINGS = {
  theme: {
    darkMode: true,
    primaryColor: '#4a76a8',
    secondaryColor: '#ffc107',
    fontSize: 'medium'
  },
  notifications: {
    enabled: true,
    sound: true,
    desktop: true,
    email: {
      enabled: false,
      frequency: 'daily',
      types: ['important', 'mentions', 'updates']
    }
  },
  llmProviders: [
    {
      id: 'provider-ollama',
      name: 'Ollama',
      type: 'ollama',
      apiKey: '',
      baseUrl: 'http://localhost:11434',
      models: [],
      defaultModel: '', // Added default model field
      enabled: true,
      contextWindow: 4096,
      temperature: 0.7
    },
    {
      id: 'provider-lmstudio',
      name: 'LM Studio',
      type: 'lmstudio',
      apiKey: '',
      baseUrl: 'http://localhost:1234/v1',
      models: [],
      defaultModel: '', // Added default model field
      enabled: true,
      contextWindow: 4096,
      temperature: 0.7
    }
  ],
  system: {
    loggingLevel: 'info',
    metrics: true,
    autoUpdate: true,
    concurrency: 3
  }
};

// Local storage helpers
const LOCAL_STORAGE_KEYS = {
  SETTINGS: 'nexa_settings',
  THEME: 'nexa_theme',
  USER_PREFERENCES: 'nexa_user_prefs'
};

const getLocalItem = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const setLocalItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
    return false;
  }
};

// API service methods with local fallbacks built in
export const apiService = {
  // Settings with localStorage fallback
  getSettings: async () => {
    // Skip network request in offline mode
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      return { data: localSettings };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        // Return directly from localStorage without attempting API call
        const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        return { data: localSettings };
      }
      
      // Only try API if server is available
      const response = await apiClient.get('/api/settings');
      return response;
    } catch (err) {
      // Fallback to localStorage
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      return { data: localSettings };
    }
  },
  
  updateSettings: async (settings) => {
    // Skip network request in offline mode
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, settings);
      return { data: { success: true } };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        // Save directly to localStorage without attempting API call
        setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, settings);
        return { data: { success: true } };
      }
      
      // Only try API if server is available
      const response = await apiClient.put('/api/settings', settings);
      
      // Also update localStorage as backup
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, settings);
      
      return response;
    } catch (err) {
      // Fallback to localStorage
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, settings);
      return { data: { success: true } };
    }
  },
  
  // LLM Provider Testing - Connect directly to local services
  testIntegration: async (providerType, credentials) => {
    if (providerType === 'ollama' && credentials.baseUrl) {
      try {
        // Direct call to Ollama API
        const ollamaUrl = credentials.baseUrl.trim();
        const response = await fetch(`${ollamaUrl}/api/tags`, {
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to connect to Ollama: ${response.statusText}`);
        }
        
        const data = await response.json();
        const models = data.models ? data.models.map(model => model.name) : [];
        
        // Suggest a default model if available
        let suggestedDefault = '';
        if (models.length > 0) {
          // Prefer llama3 if available, otherwise the first model
          suggestedDefault = models.find(m => m.includes('llama3')) || models[0];
        }
        
        return {
          data: {
            success: true,
            message: `Successfully connected to Ollama at ${ollamaUrl}`,
            models,
            suggestedDefault
          }
        };
      } catch (err) {
        console.error('Ollama connection error:', err.message);
        return {
          data: {
            success: false,
            message: `Failed to connect to Ollama: ${err.message}`,
            models: []
          }
        };
      }
    } 
    else if (providerType === 'lmstudio' && credentials.baseUrl) {
      try {
        // Direct call to LM Studio API
        const lmStudioUrl = credentials.baseUrl.trim();
        const response = await fetch(`${lmStudioUrl}/models`, {
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to connect to LM Studio: ${response.statusText}`);
        }
        
        const data = await response.json();
        const models = data.data ? data.data.map(model => model.id) : [];
        
        return {
          data: {
            success: true,
            message: `Successfully connected to LM Studio at ${lmStudioUrl}`,
            models
          }
        };
      } catch (err) {
        console.error('LM Studio connection error:', err.message);
        return {
          data: {
            success: false,
            message: `Failed to connect to LM Studio: ${err.message}`,
            models: []
          }
        };
      }
    }
    
    // Skip backend API check in offline mode
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      return {
        data: {
          success: false,
          message: 'Backend server is not available to process this request.',
          models: []
        }
      };
    }
    
    // For other providers, check backend
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        return {
          data: {
            success: false,
            message: 'Backend server is not available to process this request.',
            models: []
          }
        };
      }
      
      return await apiClient.post(`/api/integrations/${providerType}/test`, credentials);
    } catch (err) {
      return {
        data: {
          success: false,
          message: 'Failed to connect to provider.',
          models: []
        }
      };
    }
  },
  
  // Get available models for a provider
  getProviderModels: async (providerType, credentials) => {
    if (providerType === 'ollama' && credentials.baseUrl) {
      try {
        // Direct call to Ollama API
        const ollamaUrl = credentials.baseUrl.trim();
        const response = await fetch(`${ollamaUrl}/api/tags`, {
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Ollama models: ${response.statusText}`);
        }
        
        const data = await response.json();
        const models = data.models ? data.models.map(model => model.name) : [];
        
        return {
          data: {
            success: true,
            models
          }
        };
      } catch (err) {
        console.error('Ollama models fetch error:', err.message);
        return {
          data: {
            success: false,
            models: []
          }
        };
      }
    } 
    else if (providerType === 'lmstudio' && credentials.baseUrl) {
      try {
        // Direct call to LM Studio API
        const lmStudioUrl = credentials.baseUrl.trim();
        const response = await fetch(`${lmStudioUrl}/models`, {
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch LM Studio models: ${response.statusText}`);
        }
        
        const data = await response.json();
        const models = data.data ? data.data.map(model => model.id) : [];
        
        return {
          data: {
            success: true,
            models
          }
        };
      } catch (err) {
        console.error('LM Studio models fetch error:', err.message);
        return {
          data: {
            success: false,
            models: []
          }
        };
      }
    }
    
    // Skip backend API check in offline mode
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      return { data: { success: false, models: [] } };
    }
    
    // For other providers, check backend
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        return { data: { success: false, models: [] } };
      }
      
      return await apiClient.post(`/api/integrations/${providerType}/models`, credentials);
    } catch (err) {
      return { data: { success: false, models: [] } };
    }
  },
  
  // Other methods with proper fallbacks
  getWorkflows: async () => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      return { data: [] };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      if (!serverAvailable) return { data: [] };
      
      return await apiClient.get('/api/workflows');
    } catch (err) {
      return { data: [] };
    }
  },
  
  getAgents: async () => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      return { data: [] };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      if (!serverAvailable) return { data: [] };
      
      return await apiClient.get('/api/agents');
    } catch (err) {
      return { data: [] };
    }
  }
};

export default apiClient;
