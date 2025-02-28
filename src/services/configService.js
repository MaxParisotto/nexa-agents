/**
 * Configuration Service
 * Provides a central interface for handling application configuration
 * including loading from file, saving to file, and fallback to localStorage
 */

import axios from 'axios';

// Default configuration values
const DEFAULT_CONFIG = {
  lmStudio: {
    apiUrl: 'http://localhost:1234',
    defaultModel: 'qwen2.5-7b-instruct-1m'
  },
  nodeEnv: 'development',
  port: 3001
};

// API endpoint for server communication
const API_ENDPOINT = 'http://localhost:3001';

// State for server availability tracking
const serverState = {
  lastChecked: 0,
  isAvailable: false,
  checkInterval: 30000, // Check server availability every 30 seconds
  consecutiveFailures: 0,
  maxConsecutiveFailures: 3
};

// Tracking configuration operations
const operationTracker = {
  lastSaveAttempt: 0,
  saveCount: 0,
  lastLoadAttempt: 0,
  loadCount: 0,
  retryDelay: 2000,  // Delay between retries in ms
  maxRetries: 3,
  // Cache the last successful operations
  cachedResponses: {
    save: null,
    load: null
  }
};

// Configuration metadata to track freshness
const configMetadata = {
  lastLoaded: 0,
  source: null,
  configHash: null,
  retryCount: 0,
  maxRetries: 3
};

// Cache configuration state
let configCache = {
  data: null,
  timestamp: 0,
  ttl: 5000 // 5 seconds TTL
};

/**
 * Check if cached config is still valid
 */
const isCacheValid = () => {
  return configCache.data && (Date.now() - configCache.timestamp < configCache.ttl);
};

/**
 * Checks if the server is available
 * @returns {Promise<boolean>} - Whether the server is available
 */
const checkServerAvailability = async (forceCheck = false) => {
  const now = Date.now();
  
  // Skip check if we checked recently and not forcing a check
  if (!forceCheck && now - serverState.lastChecked < serverState.checkInterval) {
    return serverState.isAvailable;
  }
  
  serverState.lastChecked = now;
  
  try {
    // Use a HEAD request to minimize data transfer
    await axios.head(`${API_ENDPOINT}/api/config/load`, { 
      timeout: 2000,
      validateStatus: (status) => status < 500 // Accept even 404 as "available"
    });
    
    // Server responded, so it's available
    serverState.isAvailable = true;
    serverState.consecutiveFailures = 0;
    return true;
  } catch (error) {
    serverState.consecutiveFailures++;
    
    // Only mark as unavailable after multiple consecutive failures
    if (serverState.consecutiveFailures >= serverState.maxConsecutiveFailures) {
      serverState.isAvailable = false;
      console.error(`Server appears to be down (${serverState.consecutiveFailures} consecutive failures)`);
    }
    
    return false;
  }
};

/**
 * Checks if an operation should be rate-limited
 * @param {string} operationType - Type of operation ('save' or 'load')
 * @returns {boolean} - Whether operation should be skipped
 */
const shouldRateLimit = (operationType) => {
  const now = Date.now();
  const tracker = operationTracker;
  
  if (operationType === 'save') {
    // If last save was less than 2 seconds ago and we've had more than 5 saves
    if (now - tracker.lastSaveAttempt < 2000 && tracker.saveCount > 5) {
      console.log('Rate limiting config save operation');
      return true;
    }
    tracker.lastSaveAttempt = now;
    tracker.saveCount++;
    
    // Reset counter after 10 seconds of inactivity
    setTimeout(() => {
      if (Date.now() - tracker.lastSaveAttempt >= 10000) {
        tracker.saveCount = 0;
      }
    }, 10000);
  } else if (operationType === 'load') {
    // If last load was less than 1 second ago and we've had more than 3 loads
    if (now - tracker.lastLoadAttempt < 1000 && tracker.loadCount > 3) {
      console.log('Rate limiting config load operation');
      return true;
    }
    tracker.lastLoadAttempt = now;
    tracker.loadCount++;
    
    // Reset counter after 5 seconds of inactivity
    setTimeout(() => {
      if (Date.now() - tracker.lastLoadAttempt >= 5000) {
        tracker.loadCount = 0;
      }
    }, 5000);
  }
  
  return false;
};

/**
 * Load configuration from file
 * @param {string} format - File format ('json' or 'yaml')
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise<object>} - Configuration object
 * @throws {Error} - If loading fails
 */
export const loadConfigFromFile = async (format = 'json', retryCount = 0) => {
  // Return cached config if valid
  if (isCacheValid()) {
    return configCache.data;
  }
  
  // Check server only once per load attempt
  const serverAvailable = await checkServerAvailability();
  if (!serverAvailable) {
    const localConfig = loadConfigFromLocalStorage();
    configCache = {
      data: localConfig,
      timestamp: Date.now(),
      ttl: 30000 // Longer TTL for fallback config
    };
    return localConfig;
  }

  try {
    const response = await axios.get(`${API_ENDPOINT}/api/config/load?format=${format}`, {
      timeout: 5000
    });

    if (response.data?.success && response.data?.content) {
      const config = format === 'json' ? JSON.parse(response.data.content) : response.data.content;
      
      // Update cache
      configCache = {
        data: config,
        timestamp: Date.now(),
        ttl: 5000
      };
      
      return config;
    }
    throw new Error('No valid configuration content found in response');
  } catch (error) {
    // Implement retry logic
    if (retryCount < operationTracker.maxRetries) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || 
          (error.response && error.response.status >= 500)) {
        console.log(`Connection error loading config, retrying (${retryCount + 1}/${operationTracker.maxRetries})...`);
        // Exponential backoff: wait longer for each retry
        const delay = operationTracker.retryDelay * Math.pow(1.5, retryCount);
        
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(loadConfigFromFile(format, retryCount + 1));
          }, delay);
        });
      }
    }
    
    // Special case for 404 - file not found is expected initially
    if (error.response && error.response.status === 404) {
      console.log('Configuration file not found, using localStorage');
      return loadConfigFromLocalStorage();
    }
    
    // Enhance error message with more details
    let errorMessage = 'Failed to load configuration';
    if (error.response) {
      errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`;
    } else if (error.request) {
      errorMessage = `Network error: ${error.code || 'No response from server'}`;
    } else {
      errorMessage = `Error: ${error.message}`;
    }
    
    console.error(errorMessage, error);
    const customError = new Error(errorMessage);
    customError.originalError = error;
    customError.code = error.code;
    
    // Mark server as potentially unavailable for future requests
    serverState.consecutiveFailures++;
    if (serverState.consecutiveFailures >= serverState.maxConsecutiveFailures) {
      serverState.isAvailable = false;
    }
    
    throw customError;
  }
};

/**
 * Save configuration to file
 * @param {object} config - Configuration object to save
 * @param {string} format - File format ('json' or 'yaml')
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise<object>} - Response data
 * @throws {Error} - If saving fails
 */
export const saveConfigToFile = async (config, format = 'json', retryCount = 0) => {
  // Always save to localStorage first as fallback
  if (typeof config === 'object') {
    saveConfigToLocalStorage(config);
  }
  
  // Apply rate limiting
  if (shouldRateLimit('save')) {
    console.log('Config save operation rate limited, using local storage only');
    
    // Return cached response if available or generate a fake success
    if (operationTracker.cachedResponses.save) {
      return {
        ...operationTracker.cachedResponses.save,
        rateLimited: true,
        message: 'Configuration saved to localStorage only (rate limited)'
      };
    }
    
    return {
      success: true,
      message: 'Configuration saved to localStorage only (rate limited)',
      rateLimited: true
    };
  }
  
  if (!config) {
    throw new Error('No configuration provided');
  }
  
  // Check if server is available before attempting to save
  const serverAvailable = await checkServerAvailability();
  if (!serverAvailable) {
    console.log('Server unavailable, saving to localStorage only');
    return {
      success: true,
      message: 'Configuration saved to localStorage only (server unavailable)',
      serverUnavailable: true
    };
  }
  
  let content;
  try {
    if (format === 'json') {
      // Ensure we're dealing with valid JSON
      if (typeof config === 'string') {
        // Validate it parses correctly
        JSON.parse(config);
        content = config;
      } else {
        // Convert object to string
        content = JSON.stringify(config, null, 2);
      }
    } else {
      // Simple YAML conversion
      if (typeof config === 'string') {
        content = config;
      } else {
        content = '';
        Object.entries(config).forEach(([key, value]) => {
          if (typeof value === 'object') {
            content += `${key}:\n`;
            Object.entries(value).forEach(([subKey, subValue]) => {
              content += `  ${subKey}: ${subValue || '""'}\n`;
            });
          } else {
            content += `${key}: ${value}\n`;
          }
        });
      }
    }
  } catch (err) {
    console.error('Error formatting configuration:', err);
    throw new Error(`Invalid configuration format: ${err.message}`);
  }
  
  try {
    const response = await axios.post(`${API_ENDPOINT}/api/config/save`, {
      format,
      content
    }, {
      timeout: 5000  // 5 second timeout
    });
    
    if (!response.data || !response.data.success) {
      throw new Error('Failed to save configuration to file');
    }
    
    // Cache successful response
    operationTracker.cachedResponses.save = response.data;
    
    return response.data;
  } catch (error) {
    // Implement retry logic
    if (retryCount < operationTracker.maxRetries) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNABORTED' || 
          (error.response && error.response.status >= 500)) {
        console.log(`Connection error saving config, retrying (${retryCount + 1}/${operationTracker.maxRetries})...`);
        // Exponential backoff: wait longer for each retry
        const delay = operationTracker.retryDelay * Math.pow(1.5, retryCount);
        
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(saveConfigToFile(config, format, retryCount + 1));
          }, delay);
        });
      }
    }
    
    // Enhance error message with more details
    let errorMessage = 'Failed to save configuration';
    if (error.response) {
      errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`;
      if (error.response.data && error.response.data.error) {
        errorMessage += ` - ${error.response.data.error}`;
      }
    } else if (error.request) {
      errorMessage = `Network error: ${error.code || 'No response from server'}`;
    } else {
      errorMessage = `Error: ${error.message}`;
    }
    
    console.error(errorMessage, error);
    const customError = new Error(errorMessage);
    customError.originalError = error;
    customError.code = error.code;
    
    // Mark server as potentially unavailable
    serverState.consecutiveFailures++;
    if (serverState.consecutiveFailures >= serverState.maxConsecutiveFailures) {
      serverState.isAvailable = false;
    }
    
    throw customError;
  }
};

/**
 * Load configuration from localStorage
 * @returns {object} - Configuration object from localStorage or defaults
 */
export const loadConfigFromLocalStorage = () => {
  // First try to get the settings from localStorage as a JSON object
  const storedSettings = localStorage.getItem('settings');
  if (storedSettings) {
    try {
      const parsedSettings = JSON.parse(storedSettings);
      if (parsedSettings && parsedSettings.lmStudio) {
        return {
          lmStudio: {
            apiUrl: localStorage.getItem('lmStudioApiUrl') || DEFAULT_CONFIG.lmStudio.apiUrl,
            defaultModel: localStorage.getItem('lmStudioDefaultModel') || DEFAULT_CONFIG.lmStudio.defaultModel
          }
        };
      }
    } catch (e) {
      console.warn('Failed to parse settings from localStorage:', e);
    }
  }
  
  // Fall back to individual keys
  return {
    lmStudio: {
      apiUrl: localStorage.getItem('lmStudioApiUrl') || DEFAULT_CONFIG.lmStudio.apiUrl,
      defaultModel: localStorage.getItem('lmStudioDefaultModel') || DEFAULT_CONFIG.lmStudio.defaultModel
    },
    nodeEnv: localStorage.getItem('nodeEnv') || DEFAULT_CONFIG.nodeEnv,
    port: localStorage.getItem('port') || DEFAULT_CONFIG.port
  };
};

/**
 * Save configuration to localStorage
 * @param {object} config - Configuration object to save
 */
export const saveConfigToLocalStorage = (config) => {
  if (!config) return;
  
  localStorage.setItem('lmStudioApiUrl', config.lmStudio?.apiUrl || '');
  localStorage.setItem('lmStudioDefaultModel', config.lmStudio?.defaultModel || '');
  localStorage.setItem('nodeEnv', config.nodeEnv || 'development');
  localStorage.setItem('port', config.port || '3001');
};

/**
 * Get default configuration values
 * @returns {object} - Default configuration object
 */
export const getDefaultConfig = () => {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // Return a deep copy
};

/**
 * Calculate a simple hash for config comparison
 * @param {object} config - Configuration to hash
 * @returns {string} - Hash string
 */
const getConfigHash = (config) => {
  if (!config) return '';
  return JSON.stringify(config)
    .split('')
    .reduce((a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0)
    .toString(36);
};

/**
 * Main function to load configuration from multiple sources
 * Tries file first, then falls back to localStorage, and finally to defaults
 * Uses metadata to track configuration freshness
 * @returns {Promise<object>} - Complete configuration object
 */
export const loadConfig = async () => {
  try {
    // Set a timestamp for this load operation
    const loadTime = Date.now();
    let config;
    let source = 'default';

    // Check if server is available
    const serverAvailable = await checkServerAvailability(true);
    
    // Try to load from file if server is available
    if (serverAvailable) {
      try {
        const fileConfig = await loadConfigFromFile('json');
        const fileConfigHash = getConfigHash(fileConfig);
        
        // Save metadata about this config
        configMetadata.lastLoaded = loadTime;
        configMetadata.source = 'file';
        configMetadata.configHash = fileConfigHash;
        
        // Also save to localStorage for future use
        saveConfigToLocalStorage(fileConfig);
        console.log('Configuration loaded from file successfully');
        
        config = fileConfig;
        source = 'file';
      } catch (fileError) {
        console.log('Error loading from file, trying localStorage', fileError);
        
        // Fall back to localStorage
        config = loadConfigFromLocalStorage();
        source = 'localStorage';
        
        // Save metadata about this config
        configMetadata.lastLoaded = loadTime;
        configMetadata.source = source;
        configMetadata.configHash = getConfigHash(config);
      }
    } else {
      console.log('Server unavailable during startup, using localStorage');
      // Server unavailable, use localStorage
      config = loadConfigFromLocalStorage();
      source = 'localStorage';
      
      // Save metadata about this config
      configMetadata.lastLoaded = loadTime;
      configMetadata.source = source;
      configMetadata.configHash = getConfigHash(config);
    }
    
    // Verify we have a valid config, otherwise use defaults
    if (!config || !config.lmStudio) {
      console.log('Invalid configuration loaded, using defaults');
      config = getDefaultConfig();
      source = 'default';
    }
    
    console.log(`Configuration loaded from ${source}`);
    return config;
  } catch (error) {
    console.error('Critical error in loadConfig', error);
    
    // Last resort: return default config
    return getDefaultConfig();
  }
};

/**
 * Main function to save configuration
 * Acts as an alias for saveConfigToFile for consistency with the API
 * @param {object} config - Configuration object to save
 * @param {string} format - File format ('json' or 'yaml')
 * @returns {Promise<object>} - Response data
 */
export const saveConfig = async (config, format = 'json') => {
  return saveConfigToFile(config, format);
};

// Load settings from localStorage
export const loadSettings = () => {
  try {
    const parsedSettings = JSON.parse(localStorage.getItem('settings') || '{}');
    if (parsedSettings && parsedSettings.lmStudio) {
      return {
        lmStudio: {
          apiUrl: localStorage.getItem('lmStudioApiUrl') || DEFAULT_CONFIG.lmStudio.apiUrl,
          defaultModel: localStorage.getItem('lmStudioDefaultModel') || DEFAULT_CONFIG.lmStudio.defaultModel
        }
      };
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_CONFIG;
  }
};

// Save settings to localStorage
export const saveSettings = (config) => {
  try {
    localStorage.setItem('settings', JSON.stringify(config));
    localStorage.setItem('lmStudioApiUrl', config.lmStudio?.apiUrl || '');
    localStorage.setItem('lmStudioDefaultModel', config.lmStudio?.defaultModel || '');
  } catch (error) {
    console.error('Error saving settings:', error);
  }
};

// Validate settings
export const validateSettings = (config) => {
  if (!config || !config.lmStudio) {
    return false;
  }
  return true;
};

// Export the full interface
export default {
  loadConfig,
  loadConfigFromFile,
  saveConfigToFile,
  loadConfigFromLocalStorage,
  saveConfigToLocalStorage,
  checkServerAvailability,
  saveConfig,
  getDefaultConfig,
  loadSettings,
  saveSettings,
  validateSettings
}; 