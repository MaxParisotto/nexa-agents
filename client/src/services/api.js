import axios from 'axios';

// Get base URL from environment variable or use default
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Flag to control network request behavior
const NETWORK_CONFIG = {
  // Set to false to allow actual network requests to LLM providers
  // Set to true to completely suppress actual network requests
  OFFLINE_MODE: false, // Set to false to use the actual server
  // Timeout for API requests (milliseconds)
  TIMEOUT: 5000, // Increased timeout for LLM connections
  // Whether to log API info messages
  VERBOSE_LOGGING: true
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

// Constants for storage
const LOCAL_STORAGE_KEYS = {
  SETTINGS: 'nexa_settings',
  THEME: 'nexa_theme',
  USER_PREFERENCES: 'nexa_user_prefs',
  LAST_SYNC: 'nexa_last_sync'
};

// Helper functions for local storage
const getLocalItem = (key, defaultValue = null) => {
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
    console.error(`Error saving ${key} to localStorage:`, error);
    return false;
  }
};

// API service methods with enhanced persistence
export const apiService = {
  // Settings with enhanced localStorage sync
  getSettings: async () => {
    const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS);
    const lastSync = getLocalItem(LOCAL_STORAGE_KEYS.LAST_SYNC);
    const now = Date.now();
    
    // If we have recent local settings (less than 5 minutes old), use them
    if (localSettings && lastSync && (now - lastSync < 300000)) {
      return { data: localSettings };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (serverAvailable) {
        // Get settings from server
        const response = await apiClient.get('/api/settings');
        const serverSettings = response.data;
        
        // Merge with local settings to preserve any offline changes
        const mergedSettings = localSettings ? 
          { ...localSettings, ...serverSettings } : 
          serverSettings;
        
        // Update local storage
        setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, mergedSettings);
        setLocalItem(LOCAL_STORAGE_KEYS.LAST_SYNC, now);
        
        return { data: mergedSettings };
      }
    } catch (err) {
      console.warn('Error fetching settings from server:', err);
    }
    
    // Fallback to local settings or defaults
    return { 
      data: localSettings || DEFAULT_SETTINGS,
      offline: true
    };
  },
  
  updateSettings: async (settings) => {
    // Always update localStorage first for immediate feedback
    setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, settings);
    setLocalItem(LOCAL_STORAGE_KEYS.LAST_SYNC, Date.now());
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (serverAvailable) {
        // Sync to server
        const response = await apiClient.put('/api/settings', settings);
        return response;
      }
    } catch (err) {
      console.warn('Error syncing settings to server:', err);
      // Don't throw error since we've already saved locally
    }
    
    return { 
      data: settings,
      offline: true
    };
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
  
  // Agent management methods
  getAgents: async () => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      // Return agents from local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      return { data: localSettings.agents?.items || [] };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        // Return agents from local settings
        const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        return { data: localSettings.agents?.items || [] };
      }
      
      return await apiClient.get('/api/agents');
    } catch (err) {
      // Fallback to local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      return { data: localSettings.agents?.items || [] };
    }
  },
  
  createAgent: async (agentData) => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      // Add agent to local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      const newAgent = {
        id: `agent-${Date.now()}`,
        ...agentData
      };
      
      const updatedSettings = {
        ...localSettings,
        agents: {
          ...localSettings.agents,
          items: [...(localSettings.agents?.items || []), newAgent]
        }
      };
      
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
      return { data: newAgent };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        // Add agent to local settings
        const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        const newAgent = {
          id: `agent-${Date.now()}`,
          ...agentData
        };
        
        const updatedSettings = {
          ...localSettings,
          agents: {
            ...localSettings.agents,
            items: [...(localSettings.agents?.items || []), newAgent]
          }
        };
        
        setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
        return { data: newAgent };
      }
      
      return await apiClient.post('/api/agents', agentData);
    } catch (err) {
      // Fallback to local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      const newAgent = {
        id: `agent-${Date.now()}`,
        ...agentData
      };
      
      const updatedSettings = {
        ...localSettings,
        agents: {
          ...localSettings.agents,
          items: [...(localSettings.agents?.items || []), newAgent]
        }
      };
      
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
      return { data: newAgent };
    }
  },
  
  updateAgent: async (id, agentData) => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      // Update agent in local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      const updatedAgent = { id, ...agentData };
      
      const updatedSettings = {
        ...localSettings,
        agents: {
          ...localSettings.agents,
          items: (localSettings.agents?.items || []).map(agent => 
            agent.id === id ? updatedAgent : agent
          )
        }
      };
      
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
      return { data: updatedAgent };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        // Update agent in local settings
        const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        const updatedAgent = { id, ...agentData };
        
        const updatedSettings = {
          ...localSettings,
          agents: {
            ...localSettings.agents,
            items: (localSettings.agents?.items || []).map(agent => 
              agent.id === id ? updatedAgent : agent
            )
          }
        };
        
        setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
        return { data: updatedAgent };
      }
      
      return await apiClient.put(`/api/agents/${id}`, agentData);
    } catch (err) {
      // Fallback to local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      const updatedAgent = { id, ...agentData };
      
      const updatedSettings = {
        ...localSettings,
        agents: {
          ...localSettings.agents,
          items: (localSettings.agents?.items || []).map(agent => 
            agent.id === id ? updatedAgent : agent
          )
        }
      };
      
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
      return { data: updatedAgent };
    }
  },
  
  deleteAgent: async (id) => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      // Delete agent from local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      
      const updatedSettings = {
        ...localSettings,
        agents: {
          ...localSettings.agents,
          items: (localSettings.agents?.items || []).filter(agent => agent.id !== id)
        }
      };
      
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
      return { data: { success: true } };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        // Delete agent from local settings
        const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        
        const updatedSettings = {
          ...localSettings,
          agents: {
            ...localSettings.agents,
            items: (localSettings.agents?.items || []).filter(agent => agent.id !== id)
          }
        };
        
        setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
        return { data: { success: true } };
      }
      
      return await apiClient.delete(`/api/agents/${id}`);
    } catch (err) {
      // Fallback to local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      
      const updatedSettings = {
        ...localSettings,
        agents: {
          ...localSettings.agents,
          items: (localSettings.agents?.items || []).filter(agent => agent.id !== id)
        }
      };
      
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
      return { data: { success: true } };
    }
  },
  
  // Tool management methods
  getTools: async () => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      // Return tools from local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      return { data: localSettings.tools?.items || [] };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        // Return tools from local settings
        const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        return { data: localSettings.tools?.items || [] };
      }
      
      return await apiClient.get('/api/tools');
    } catch (err) {
      // Fallback to local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      return { data: localSettings.tools?.items || [] };
    }
  },
  
  createTool: async (toolData) => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      // Add tool to local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      const newTool = {
        id: `tool-${Date.now()}`,
        ...toolData
      };
      
      const updatedSettings = {
        ...localSettings,
        tools: {
          ...localSettings.tools,
          items: [...(localSettings.tools?.items || []), newTool]
        }
      };
      
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
      return { data: newTool };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        // Add tool to local settings
        const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        const newTool = {
          id: `tool-${Date.now()}`,
          ...toolData
        };
        
        const updatedSettings = {
          ...localSettings,
          tools: {
            ...localSettings.tools,
            items: [...(localSettings.tools?.items || []), newTool]
          }
        };
        
        setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
        return { data: newTool };
      }
      
      return await apiClient.post('/api/tools', toolData);
    } catch (err) {
      // Fallback to local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      const newTool = {
        id: `tool-${Date.now()}`,
        ...toolData
      };
      
      const updatedSettings = {
        ...localSettings,
        tools: {
          ...localSettings.tools,
          items: [...(localSettings.tools?.items || []), newTool]
        }
      };
      
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
      return { data: newTool };
    }
  },
  
  updateTool: async (id, toolData) => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      // Update tool in local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      const updatedTool = { id, ...toolData };
      
      const updatedSettings = {
        ...localSettings,
        tools: {
          ...localSettings.tools,
          items: (localSettings.tools?.items || []).map(tool => 
            tool.id === id ? updatedTool : tool
          )
        }
      };
      
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
      return { data: updatedTool };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        // Update tool in local settings
        const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        const updatedTool = { id, ...toolData };
        
        const updatedSettings = {
          ...localSettings,
          tools: {
            ...localSettings.tools,
            items: (localSettings.tools?.items || []).map(tool => 
              tool.id === id ? updatedTool : tool
            )
          }
        };
        
        setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
        return { data: updatedTool };
      }
      
      return await apiClient.put(`/api/tools/${id}`, toolData);
    } catch (err) {
      // Fallback to local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      const updatedTool = { id, ...toolData };
      
      const updatedSettings = {
        ...localSettings,
        tools: {
          ...localSettings.tools,
          items: (localSettings.tools?.items || []).map(tool => 
            tool.id === id ? updatedTool : tool
          )
        }
      };
      
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
      return { data: updatedTool };
    }
  },
  
  deleteTool: async (id) => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      // Delete tool from local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      
      const updatedSettings = {
        ...localSettings,
        tools: {
          ...localSettings.tools,
          items: (localSettings.tools?.items || []).filter(tool => tool.id !== id)
        }
      };
      
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
      return { data: { success: true } };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        // Delete tool from local settings
        const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        
        const updatedSettings = {
          ...localSettings,
          tools: {
            ...localSettings.tools,
            items: (localSettings.tools?.items || []).filter(tool => tool.id !== id)
          }
        };
        
        setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
        return { data: { success: true } };
      }
      
      return await apiClient.delete(`/api/tools/${id}`);
    } catch (err) {
      // Fallback to local settings
      const localSettings = getLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
      
      const updatedSettings = {
        ...localSettings,
        tools: {
          ...localSettings.tools,
          items: (localSettings.tools?.items || []).filter(tool => tool.id !== id)
        }
      };
      
      setLocalItem(LOCAL_STORAGE_KEYS.SETTINGS, updatedSettings);
      return { data: { success: true } };
    }
  },
  
  // Run benchmark tests on models
  runBenchmark: async (benchmarkConfig) => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      return { data: null }; // Let the component generate mock data
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      
      if (!serverAvailable) {
        return { data: null }; // Let the component generate mock data
      }
      
      // Only try API if server is available
      const response = await apiClient.post('/api/benchmark/run', benchmarkConfig);
      return response;
    } catch (err) {
      console.info(`Benchmark API request failed: ${err.message}`);
      return { data: null }; // Let the component generate mock data
    }
  },
  
  // Get benchmark history
  getBenchmarkHistory: async () => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      return { data: [] }; 
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      if (!serverAvailable) return { data: [] };
      
      return await apiClient.get('/api/benchmark/history');
    } catch (err) {
      return { data: [] };
    }
  },
  
  // Get a specific benchmark result
  getBenchmarkResult: async (benchmarkId) => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      return { data: null };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      if (!serverAvailable) return { data: null };
      
      return await apiClient.get(`/api/benchmark/result/${benchmarkId}`);
    } catch (err) {
      return { data: null };
    }
  },
  
  // Request test for uplink connection
  requestUplinkTest: async (config) => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      return { 
        data: { 
          success: true, 
          message: "Mock uplink connection test successful",
          connectionId: "mock-connection-" + Date.now()
        }
      };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      if (!serverAvailable) {
        return { 
          data: { 
            success: true, 
            message: "Mock uplink connection test successful",
            connectionId: "mock-connection-" + Date.now()
          }
        };
      }
      
      return await apiClient.post('/api/uplink/test', config);
    } catch (err) {
      return { 
        data: { 
          success: false, 
          message: `Connection test failed: ${err.message}`
        }
      };
    }
  },
  
  // Start uplink server
  startUplink: async (config) => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      return { 
        data: { 
          success: true, 
          message: "Uplink started in simulation mode",
          serverId: "mock-server-" + Date.now()
        }
      };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      if (!serverAvailable) {
        return { 
          data: { 
            success: true, 
            message: "Uplink started in simulation mode",
            serverId: "mock-server-" + Date.now()
          }
        };
      }
      
      return await apiClient.post('/api/uplink/start', config);
    } catch (err) {
      return { 
        data: { 
          success: false, 
          message: `Failed to start uplink: ${err.message}`
        }
      };
    }
  },
  
  // Stop uplink server
  stopUplink: async (serverId) => {
    if (NETWORK_CONFIG.OFFLINE_MODE) {
      return { 
        data: { 
          success: true, 
          message: "Uplink stopped successfully"
        }
      };
    }
    
    try {
      const serverAvailable = await checkBackendAvailability();
      if (!serverAvailable) {
        return { 
          data: { 
            success: true, 
            message: "Uplink stopped successfully"
          }
        };
      }
      
      return await apiClient.post('/api/uplink/stop', { serverId });
    } catch (err) {
      return { 
        data: { 
          success: false, 
          message: `Failed to stop uplink: ${err.message}`
        }
      };
    }
  }
};

export default apiClient;
