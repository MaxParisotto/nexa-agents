/**
 * LLM Service - Unified service for interacting with LLM providers
 * Handles connection monitoring and API interactions
 */
import axios from 'axios';
import connectionMonitor from '../utils/ConnectionMonitor';
import messageDeduplicator from '../utils/MessageDeduplicator';
import { logInfo, logError, logDebug, logWarning } from '../store/actions/logActions';
import store from '../store';

class LlmService {
  constructor() {
    this.providers = {
      lmStudio: {
        baseUrl: 'http://localhost:1234',
        model: '',
        connected: false
      },
      ollama: {
        baseUrl: 'http://localhost:11434',
        model: '',
        connected: false
      }
    };
    
    this.modelCache = new Map();
    this.pendingChecks = new Map();
    
    // Register services with connection monitor
    this.lmStudioMonitor = connectionMonitor.registerService(
      'lmStudio',
      () => this.checkLmStudioConnection(),
      60000 // 1 minute
    );
    
    this.ollamaMonitor = connectionMonitor.registerService(
      'ollama',
      () => this.checkOllamaConnection(),
      60000 // 1 minute
    );
    
    // Load cached models
    this.loadCachedModels();
  }

  /**
   * Load models from local storage
   * @private
   */
  loadCachedModels() {
    try {
      // LM Studio models
      const lmStudioModelsJson = localStorage.getItem('lmStudioModels');
      if (lmStudioModelsJson) {
        const data = JSON.parse(lmStudioModelsJson);
        this.modelCache.set('lmStudio', {
          models: data.models || [],
          timestamp: data.timestamp || Date.now(),
          apiUrl: data.apiUrl
        });
      }
      
      // Ollama models
      const ollamaModelsJson = localStorage.getItem('ollamaModels');
      if (ollamaModelsJson) {
        const data = JSON.parse(ollamaModelsJson);
        this.modelCache.set('ollama', {
          models: data.models || [],
          timestamp: data.timestamp || Date.now(),
          apiUrl: data.apiUrl
        });
      }
    } catch (error) {
      console.error('Error loading cached models:', error);
    }
  }

  /**
   * Update provider settings
   * @param {string} provider - Provider name ('lmStudio' or 'ollama')
   * @param {object} settings - Provider settings
   */
  updateProviderSettings(provider, settings) {
    if (this.providers[provider]) {
      this.providers[provider] = {
        ...this.providers[provider],
        ...settings
      };
    }
  }

  /**
   * Get models for a provider (using cache if available and recent)
   * @param {string} provider - Provider name ('lmStudio' or 'ollama')
   * @param {boolean} forceRefresh - Force refresh from API
   * @returns {Promise<Array>} - Array of model names
   */
  async getModels(provider, forceRefresh = false) {
    // Check if we have a pending request for this provider
    if (this.pendingChecks.has(provider)) {
      const logMessage = `Reusing pending request for ${provider} models at ${this.providers[provider].baseUrl}`;
      this.log('info', logMessage, null, 'model-list');
      return this.pendingChecks.get(provider);
    }
    
    // Check if we have a recent cache
    const cache = this.modelCache.get(provider);
    const maxCacheAge = 5 * 60 * 1000; // 5 minutes
    
    if (!forceRefresh && 
        cache && 
        cache.models.length > 0 && 
        cache.apiUrl === this.providers[provider].baseUrl &&
        (Date.now() - cache.timestamp) < maxCacheAge) {
      
      const logMessage = `Returning cached ${provider} models for ${cache.apiUrl}, count: ${cache.models.length}`;
      this.log('info', logMessage, null, 'model-list');
      return Promise.resolve(cache.models);
    }
    
    // Create a new request
    const fetchPromise = this._fetchModels(provider);
    this.pendingChecks.set(provider, fetchPromise);
    
    // Clear the pending check after completion
    fetchPromise.finally(() => {
      this.pendingChecks.delete(provider);
    });
    
    return fetchPromise;
  }

  /**
   * Fetch models from API
   * @private
   */
  async _fetchModels(provider) {
    const apiUrl = this.providers[provider].baseUrl;
    
    const logMessage = `Fetching ${provider} models from ${apiUrl}`;
    this.log('info', logMessage, null, 'model-list');
    
    try {
      let models = [];
      
      if (provider === 'lmStudio') {
        const response = await axios.get(`${apiUrl}/v1/models`);
        models = response.data.data.map(model => model.id);
      } else if (provider === 'ollama') {
        const response = await axios.get(`${apiUrl}/api/tags`);
        models = response.data.models.map(model => model.name);
      }
      
      // Update cache
      this.modelCache.set(provider, {
        models,
        timestamp: Date.now(),
        apiUrl
      });
      
      // Save to local storage
      localStorage.setItem(`${provider}Models`, JSON.stringify({
        models,
        timestamp: Date.now(),
        apiUrl
      }));
      
      this.log('info', `Found ${models.length} ${provider} models`, null, 'model-list');
      return models;
    } catch (error) {
      console.error(`Error fetching ${provider} models:`, error);
      return [];
    }
  }

  /**
   * Check LM Studio connection
   * @private
   */
  async checkLmStudioConnection() {
    const apiUrl = this.providers.lmStudio.baseUrl;
    const model = this.providers.lmStudio.model;
    
    try {
      const response = await axios.get(`${apiUrl}/v1/models`, { 
        timeout: 5000 
      });
      
      const success = response.status === 200;
      const models = success ? response.data.data.map(model => model.id) : [];
      
      const connected = success && models.length > 0;
      const modelAvailable = connected && model ? models.includes(model) : false;
      
      if (connected && model && modelAvailable) {
        this.log('info', `Model ${model} is available in LM Studio`, null, 'model-available');
      }
      
      const status = {
        connected,
        apiUrl,
        models,
        modelAvailable,
        rawResponse: success ? response : null
      };
      
      if (connected) {
        this.log('info', `LM Studio connection successful`, status, 'connection-success');
      }
      
      return status;
    } catch (error) {
      console.error('LM Studio connection check failed:', error.message);
      return {
        connected: false,
        apiUrl,
        error: error.message
      };
    }
  }

  /**
   * Check Ollama connection
   * @private
   */
  async checkOllamaConnection() {
    const apiUrl = this.providers.ollama.baseUrl;
    const model = this.providers.ollama.model;
    
    try {
      const response = await axios.get(`${apiUrl}/api/tags`, { 
        timeout: 5000 
      });
      
      const success = response.status === 200;
      const models = success ? response.data.models.map(model => model.name) : [];
      
      const connected = success && models.length > 0;
      const modelAvailable = connected && model ? models.includes(model) : false;
      
      if (connected && model && modelAvailable) {
        this.log('info', `Model ${model} is available in Ollama`, null, 'model-available');
      }
      
      const status = {
        connected,
        apiUrl,
        models,
        modelAvailable,
        rawResponse: success ? response : null
      };
      
      if (connected) {
        this.log('info', `Ollama connection successful`, status, 'connection-success');
      }
      
      return status;
    } catch (error) {
      console.error('Ollama connection check failed:', error.message);
      return {
        connected: false,
        apiUrl,
        error: error.message
      };
    }
  }

  /**
   * Log message with deduplication
   * @private
   */
  log(level, message, data = null, category = null) {
    switch (level) {
      case 'debug':
        store.dispatch(logDebug('LLM', message, data));
        break;
      case 'info':
        store.dispatch(logInfo('LLM', message, data));
        break;
      case 'warning':
        store.dispatch(logWarning('LLM', message, data));
        break;
      case 'error':
        store.dispatch(logError('LLM', message, data));
        break;
    }
  }
  
  /**
   * Generate a completion using an LLM provider
   * @param {string} provider - Provider name ('lmStudio' or 'ollama')
   * @param {string} prompt - Prompt text
   * @param {object} options - Generation options
   * @returns {Promise<string>} - Generated text
   */
  async generateCompletion(provider, prompt, options = {}) {
    if (!this.providers[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    
    const apiUrl = options.apiUrl || this.providers[provider].baseUrl;
    const model = options.model || this.providers[provider].model;
    
    if (!model) {
      throw new Error(`No model selected for ${provider}`);
    }
    
    if (provider === 'lmStudio') {
      return this.generateLmStudioCompletion(apiUrl, model, prompt, options);
    } else if (provider === 'ollama') {
      return this.generateOllamaCompletion(apiUrl, model, prompt, options);
    }
    
    throw new Error(`Unsupported provider: ${provider}`);
  }
  
  /**
   * Generate a completion using LM Studio
   * @private
   */
  async generateLmStudioCompletion(apiUrl, model, prompt, options = {}) {
    const endpoint = `${apiUrl}/v1/chat/completions`;
    
    const requestBody = {
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.9,
      max_tokens: options.maxTokens ?? 1024
    };
    
    const response = await axios.post(endpoint, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: options.timeout ?? 30000
    });
    
    if (response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content;
    }
    
    throw new Error('No completion in response');
  }
  
  /**
   * Generate a completion using Ollama
   * @private
   */
  async generateOllamaCompletion(apiUrl, model, prompt, options = {}) {
    const endpoint = `${apiUrl}/api/generate`;
    
    const requestBody = {
      model,
      prompt,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 0.9,
      num_predict: options.maxTokens ?? 1024
    };
    
    const response = await axios.post(endpoint, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: options.timeout ?? 30000
    });
    
    return response.data.response;
  }
}

// Export singleton instance
const llmService = new LlmService();
export default llmService;
