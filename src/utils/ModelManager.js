import axios from 'axios';
import { debounce } from 'lodash';
import store from '../store';
import { logInfo, logWarning, logError, LOG_CATEGORIES } from '../store/actions/logActions';

/**
 * ModelManager - Centralized utility for fetching and managing LLM models
 * 
 * Handles:
 * - Fetching models from various LLM providers
 * - Caching results to prevent excessive API calls
 * - Debouncing requests to avoid overwhelming servers
 */
class ModelManager {
  constructor() {
    this.cache = {
      lmStudio: {
        models: [],
        lastFetched: null,
        isFetching: false,
        url: null
      },
      ollama: {
        models: [],
        lastFetched: null,
        isFetching: false,
        url: null
      }
    };
    
    // Cache expiration time in milliseconds (5 minutes)
    this.cacheExpiration = 5 * 60 * 1000;
    
    // Pending requests tracking
    this.pendingRequests = new Map();
    
    // Fix: Bind methods before creating debounced versions
    this._fetchLmStudioModels = this._fetchLmStudioModels.bind(this);
    this._fetchOllamaModels = this._fetchOllamaModels.bind(this);
    
    // Create debounced fetch methods (300ms delay)
    this.debouncedFetchLmStudioModels = debounce(this._fetchLmStudioModels, 300);
    this.debouncedFetchOllamaModels = debounce(this._fetchOllamaModels, 300);

    // Add logging configuration
    this.loggingConfig = {
      enabled: true,
      logLevel: 'info',    // 'debug', 'info', 'warning', 'error'
      detailedLogging: false,
      lastLoggedMessages: {}, // Track the last timestamp for each message type
      logThrottleTime: 300000, // 5 minutes between identical logs
    };
  }
  
  /**
   * Log to both console and Redux store with throttling
   */
  log(level, message, data = null) {
    // Skip if logging is disabled
    if (!this.loggingConfig.enabled) {
      return;
    }
    
    // Implement throttling for repetitive messages
    const messageKey = `${level}-${message}`;
    const now = Date.now();
    const lastLogTime = this.loggingConfig.lastLoggedMessages[messageKey] || 0;
    
    if (now - lastLogTime < this.loggingConfig.logThrottleTime) {
      // Skip if we've logged this message recently
      return;
    }
    
    // Update the timestamp for this message
    this.loggingConfig.lastLoggedMessages[messageKey] = now;
    
    // Only log detailed data if enabled
    const logData = this.loggingConfig.detailedLogging ? data : null;
    
    const category = LOG_CATEGORIES.LLM;
    
    switch (level) {
      case 'error':
        console.error(`[ModelManager] ${message}`, data || '');
        store.dispatch(logError(category, message, logData));
        break;
      case 'warn':
        console.warn(`[ModelManager] ${message}`, data || '');
        store.dispatch(logWarning(category, message, logData));
        break;
      case 'info':
        console.info(`[ModelManager] ${message}`, data || '');
        store.dispatch(logInfo(category, message, logData));
        break;
      default:
        console.log(`[ModelManager] ${message}`, data || '');
    }
  }
  
  /**
   * Get LM Studio models
   * @param {string} apiUrl - LM Studio API URL
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise<Array>} - List of available models
   */
  async getLmStudioModels(apiUrl = 'http://localhost:1234', forceRefresh = false) {
    // Normalize URL for consistent caching
    const normalizedUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    
    // Check if we already have fresh cached data for this URL
    if (!forceRefresh && 
        this.cache.lmStudio.models.length > 0 && 
        this.cache.lmStudio.url === normalizedUrl &&
        this.cache.lmStudio.lastFetched && 
        (Date.now() - this.cache.lmStudio.lastFetched) < this.cacheExpiration) {
      this.log('info', `Returning cached LM Studio models for ${normalizedUrl}, count: ${this.cache.lmStudio.models.length}`);
      return this.cache.lmStudio.models;
    }
    
    // Check if there's already a fetch in progress for this URL
    const requestKey = `lmStudio-${normalizedUrl}`;
    if (this.pendingRequests.has(requestKey)) {
      this.log('info', `Reusing pending request for LM Studio models at ${normalizedUrl}`);
      return this.pendingRequests.get(requestKey);
    }
    
    // Fix: Create a proper promise and add it to pending requests
    const fetchPromise = new Promise(async (resolve) => {
      try {
        const result = await this._fetchLmStudioModels(normalizedUrl);
        resolve(result);
      } catch (error) {
        this.log('error', `Error fetching LM Studio models: ${error.message}`);
        resolve([]); // Return empty array on error
      } finally {
        // Remove from pending requests
        this.pendingRequests.delete(requestKey);
      }
    });
    
    // Store the promise in pending requests
    this.pendingRequests.set(requestKey, fetchPromise);
    
    return fetchPromise;
  }
  
  /**
   * Internal method to fetch models from LM Studio
   * @private
   */
  async _fetchLmStudioModels(apiUrl) {
    this.cache.lmStudio.isFetching = true;
    
    try {
      this.log('info', `Fetching LM Studio models from ${apiUrl}`);
      
      // Ensure URL starts with http
      const baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
      
      // Fetch models
      const response = await axios.get(`${baseUrl}/v1/models`, { 
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      
      // Process response
      if (response.status === 200) {
        const models = response.data?.data?.map(model => model.id) || [];
        
        // Update cache
        this.cache.lmStudio.models = models;
        this.cache.lmStudio.lastFetched = Date.now();
        this.cache.lmStudio.url = apiUrl;
        
        this.log('info', `Found ${models.length} LM Studio models`);
        return models;
      } else {
        throw new Error(`LM Studio API returned status: ${response.status}`);
      }
    } catch (error) {
      this.log('error', `Failed to fetch LM Studio models: ${error.message}`);
      this.cache.lmStudio.models = []; // Clear invalid cache
      throw error;
    } finally {
      this.cache.lmStudio.isFetching = false;
    }
  }
  
  /**
   * Get Ollama models
   * @param {string} apiUrl - Ollama API URL
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise<Array>} - List of available models
   */
  async getOllamaModels(apiUrl = 'http://localhost:11434', forceRefresh = false) {
    // Normalize URL for consistent caching
    const normalizedUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    
    // Check if we already have fresh cached data for this URL
    if (!forceRefresh && 
        this.cache.ollama.models.length > 0 && 
        this.cache.ollama.url === normalizedUrl &&
        this.cache.ollama.lastFetched && 
        (Date.now() - this.cache.ollama.lastFetched) < this.cacheExpiration) {
      this.log('info', `Returning cached Ollama models for ${normalizedUrl}, count: ${this.cache.ollama.models.length}`);
      return this.cache.ollama.models;
    }
    
    // Check if there's already a fetch in progress for this URL
    const requestKey = `ollama-${normalizedUrl}`;
    if (this.pendingRequests.has(requestKey)) {
      this.log('info', `Reusing pending request for Ollama models at ${normalizedUrl}`);
      return this.pendingRequests.get(requestKey);
    }
    
    // Fix: Create a proper promise and add it to pending requests
    const fetchPromise = new Promise(async (resolve) => {
      try {
        const result = await this._fetchOllamaModels(normalizedUrl);
        resolve(result);
      } catch (error) {
        this.log('error', `Error fetching Ollama models: ${error.message}`);
        resolve([]); // Return empty array on error
      } finally {
        // Remove from pending requests
        this.pendingRequests.delete(requestKey);
      }
    });
    
    // Store the promise in pending requests
    this.pendingRequests.set(requestKey, fetchPromise);
    
    return fetchPromise;
  }
  
  /**
   * Internal method to fetch models from Ollama
   * @private
   */
  async _fetchOllamaModels(apiUrl) {
    this.cache.ollama.isFetching = true;
    
    try {
      this.log('info', `Fetching Ollama models from ${apiUrl}`);
      
      // Ensure URL starts with http
      const baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
      
      // Fetch models
      const response = await axios.get(`${baseUrl}/api/tags`, { 
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      
      // Process response
      if (response.status === 200) {
        const models = response.data?.models?.map(model => model.name) || [];
        
        // Update cache
        this.cache.ollama.models = models;
        this.cache.ollama.lastFetched = Date.now();
        this.cache.ollama.url = apiUrl;
        
        this.log('info', `Found ${models.length} Ollama models`);
        return models;
      } else {
        throw new Error(`Ollama API returned status: ${response.status}`);
      }
    } catch (error) {
      this.log('error', `Failed to fetch Ollama models: ${error.message}`);
      this.cache.ollama.models = []; // Clear invalid cache
      throw error;
    } finally {
      this.cache.ollama.isFetching = false;
    }
  }
  
  /**
   * Get models from either provider
   * @param {string} provider - Provider name ('lmStudio' or 'ollama')
   * @param {string} apiUrl - API URL
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise<Array>} - List of available models
   */
  async getModels(provider, apiUrl, forceRefresh = false) {
    if (provider === 'lmStudio') {
      return this.getLmStudioModels(apiUrl, forceRefresh);
    } else if (provider === 'ollama') {
      return this.getOllamaModels(apiUrl, forceRefresh);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }
  
  /**
   * Get the current cache status
   * @returns {Object} - Cache status object
   */
  getCacheStatus() {
    return {
      lmStudio: {
        modelCount: this.cache.lmStudio.models.length,
        lastFetched: this.cache.lmStudio.lastFetched,
        isFresh: this.cache.lmStudio.lastFetched && 
                 (Date.now() - this.cache.lmStudio.lastFetched) < this.cacheExpiration,
        isFetching: this.cache.lmStudio.isFetching,
        url: this.cache.lmStudio.url
      },
      ollama: {
        modelCount: this.cache.ollama.models.length,
        lastFetched: this.cache.ollama.lastFetched,
        isFresh: this.cache.ollama.lastFetched && 
                 (Date.now() - this.cache.ollama.lastFetched) < this.cacheExpiration,
        isFetching: this.cache.ollama.isFetching,
        url: this.cache.ollama.url
      }
    };
  }
  
  /**
   * Clear the cache for a specific provider or all providers
   * @param {string} provider - Provider name ('lmStudio', 'ollama', or null for all)
   */
  clearCache(provider = null) {
    if (!provider || provider === 'lmStudio') {
      this.cache.lmStudio.models = [];
      this.cache.lmStudio.lastFetched = null;
      this.log('info', 'Cleared LM Studio models cache');
    }
    
    if (!provider || provider === 'ollama') {
      this.cache.ollama.models = [];
      this.cache.ollama.lastFetched = null;
      this.log('info', 'Cleared Ollama models cache');
    }
  }
}

// Export a singleton instance
const modelManager = new ModelManager();
export default modelManager;
