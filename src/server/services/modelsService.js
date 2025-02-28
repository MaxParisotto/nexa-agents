/**
 * Models Service
 * Handles model-related operations like fetching model lists and testing connections
 */

const axios = require('axios');
const logger = require('../utils/logger');
const settingsService = require('./settingsService');

/**
 * Cache to store model lists by provider + API URL
 * To avoid repeated requests for the same data
 */
const modelsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear expired entries from the cache
 */
const cleanupCache = () => {
  const now = Date.now();
  let expiredCount = 0;
  
  modelsCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_TTL) {
      modelsCache.delete(key);
      expiredCount++;
    }
  });
  
  if (expiredCount > 0) {
    logger.debug(`Cleaned up ${expiredCount} expired model cache entries`);
  }
};

// Set up periodic cache cleanup
setInterval(cleanupCache, 60000);

/**
 * Fetch models from LM Studio
 */
const fetchLmStudioModels = async (apiUrl) => {
  try {
    const response = await axios.get(`${apiUrl}/v1/models`, {
      timeout: 5000
    });
    
    if (response.data?.data && Array.isArray(response.data.data)) {
      return response.data.data.map(model => model.id);
    }
    
    throw new Error('Invalid response from LM Studio');
  } catch (error) {
    logger.error('Error fetching LM Studio models', {
      error: error.message,
      apiUrl
    });
    throw error;
  }
};

/**
 * Fetch models from Ollama
 */
const fetchOllamaModels = async (apiUrl) => {
  try {
    const response = await axios.get(`${apiUrl}/api/tags`, {
      timeout: 5000
    });
    
    if (response.data?.models && Array.isArray(response.data.models)) {
      return response.data.models.map(model => model.name);
    }
    
    throw new Error('Invalid response from Ollama');
  } catch (error) {
    logger.error('Error fetching Ollama models', {
      error: error.message,
      apiUrl
    });
    throw error;
  }
};

/**
 * Fetch models from LM provider
 */
const fetchModels = async (provider, apiUrl, serverType) => {
  // Normalize and validate inputs
  provider = provider.toLowerCase();
  if (!apiUrl.startsWith('http')) {
    apiUrl = `http://${apiUrl}`;
  }
  
  // Check cache first to avoid unnecessary API calls
  const cacheKey = `${provider}:${apiUrl}`;
  const cachedEntry = modelsCache.get(cacheKey);
  
  if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL)) {
    logger.debug(`Using cached models for ${provider}`, { 
      apiUrl, 
      count: cachedEntry.models.length
    });
    return cachedEntry.models;
  }
  
  logger.info(`Fetching models from ${provider}`, { apiUrl, serverType });
  
  let models = [];
  
  // Special handling for projectManager (map to the actual backend service)
  if (provider === 'projectmanager') {
    // For projectManager, we need to determine if we're talking to LM Studio or Ollama
    // Use the provided serverType, or make a best guess based on the URL
    let backendProvider;
    
    if (serverType) {
      // Use the provided serverType directly
      backendProvider = serverType.toLowerCase() === 'lmstudio' ? 'lmstudio' : 'ollama';
    } else {
      // Check the URL port to make a best guess
      const url = new URL(apiUrl);
      const port = url.port;
      
      // Default to lmStudio for 1234 port, ollama for 11434
      backendProvider = 'lmstudio'; // default
      if (port === '11434') {
        backendProvider = 'ollama';
      } else if (port === '1234') {
        backendProvider = 'lmstudio';
      }
    }
    
    logger.info(`ProjectManager is using ${backendProvider} backend`, { apiUrl, serverType });
    
    try {
      // Try to fetch models from the determined backend
      models = await (backendProvider === 'lmstudio' ? 
        fetchLmStudioModels(apiUrl) : fetchOllamaModels(apiUrl));
        
      // Cache the results with the projectManager provider
      modelsCache.set(cacheKey, {
        models,
        timestamp: Date.now()
      });
      
      return models;
    } catch (error) {
      logger.error(`Failed to fetch models for ProjectManager using ${backendProvider}`, {
        error: error.message,
        apiUrl,
        serverType
      });
      
      // Return empty array on failure
      return [];
    }
  }
  // Fetch from appropriate provider
  else if (provider === 'lmstudio') {
    models = await fetchLmStudioModels(apiUrl);
  } else if (provider === 'ollama') {
    models = await fetchOllamaModels(apiUrl);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  
  // Cache the results
  modelsCache.set(cacheKey, {
    models,
    timestamp: Date.now()
  });
  
  logger.info(`Fetched ${models.length} models from ${provider}`, { apiUrl });
  return models;
};

/**
 * Test model in LM Studio
 */
const testLmStudioConnection = async (apiUrl, model) => {
  try {
    // First check if we can get the models list
    await fetchLmStudioModels(apiUrl);
    
    // If model is specified, check if it exists
    if (model) {
      const models = await fetchLmStudioModels(apiUrl);
      const modelExists = models.includes(model);
      
      if (!modelExists) {
        return {
          success: false,
          error: `Model "${model}" not found in LM Studio`,
          availableModels: models,
          connectionOk: true
        };
      }
      
      // Test a simple completion (optional)
      try {
        const response = await axios.post(
          `${apiUrl}/v1/chat/completions`,
          {
            model: model,
            messages: [
              { role: 'system', content: 'You are a helpful assistant.' },
              { role: 'user', content: 'Say hello!' }
            ],
            max_tokens: 10,
            temperature: 0.1
          },
          { timeout: 10000 }
        );
        
        // If we get here, the model is working
        return {
          success: true,
          model,
          apiUrl,
          testResponse: response.data?.choices?.[0]?.message?.content || 'No response content'
        };
      } catch (completionError) {
        // Connection works but model has issues
        return {
          success: false,
          error: `Model test failed: ${completionError.message}`,
          apiUrl,
          model,
          connectionOk: true
        };
      }
    }
    
    // If no model specified, just return success for connection
    return {
      success: true,
      apiUrl,
      connectionOk: true
    };
  } catch (error) {
    return {
      success: false,
      error: `Connection to LM Studio failed: ${error.message}`,
      apiUrl,
      connectionOk: false
    };
  }
};

/**
 * Test model in Ollama
 */
const testOllamaConnection = async (apiUrl, model) => {
  try {
    // First check if we can get the models list
    await fetchOllamaModels(apiUrl);
    
    // If model is specified, check if it exists
    if (model) {
      const models = await fetchOllamaModels(apiUrl);
      const modelExists = models.includes(model);
      
      if (!modelExists) {
        return {
          success: false,
          error: `Model "${model}" not found in Ollama`,
          availableModels: models,
          connectionOk: true
        };
      }
      
      // Test a simple completion (optional)
      try {
        const response = await axios.post(
          `${apiUrl}/api/generate`,
          {
            model: model,
            prompt: 'Say hello!',
            system: 'You are a helpful assistant.',
            max_tokens: 10,
            temperature: 0.1
          },
          { timeout: 10000 }
        );
        
        // If we get here, the model is working
        return {
          success: true,
          model,
          apiUrl,
          testResponse: response.data?.response || 'No response content'
        };
      } catch (completionError) {
        // Connection works but model has issues
        return {
          success: false,
          error: `Model test failed: ${completionError.message}`,
          apiUrl,
          model,
          connectionOk: true
        };
      }
    }
    
    // If no model specified, just return success for connection
    return {
      success: true,
      apiUrl,
      connectionOk: true
    };
  } catch (error) {
    return {
      success: false,
      error: `Connection to Ollama failed: ${error.message}`,
      apiUrl,
      connectionOk: false
    };
  }
};

/**
 * Test connection to an LM provider
 */
const testConnection = async (provider, apiUrl, model, serverType) => {
  // Normalize and validate inputs
  provider = provider.toLowerCase();
  if (!apiUrl.startsWith('http')) {
    apiUrl = `http://${apiUrl}`;
  }
  
  logger.info(`Testing connection to ${provider}`, { apiUrl, model, serverType });
  
  // Special handling for projectManager
  if (provider === 'projectmanager') {
    // Use the provided serverType, or determine the backend service based on port
    let backendProvider;
    
    if (serverType) {
      backendProvider = serverType.toLowerCase() === 'lmstudio' ? 'lmstudio' : 'ollama';
    } else {
      const url = new URL(apiUrl);
      const port = url.port;
      
      // Default to lmStudio for 1234 port, ollama for 11434
      backendProvider = 'lmstudio'; // default
      if (port === '11434') {
        backendProvider = 'ollama';
      } else if (port === '1234') {
        backendProvider = 'lmstudio';
      }
    }
    
    logger.info(`ProjectManager is using ${backendProvider} backend for connection test`, { apiUrl, serverType });
    
    try {
      // Test connection using the appropriate backend tester
      const result = await (backendProvider === 'lmstudio' ?
        testLmStudioConnection(apiUrl, model) : testOllamaConnection(apiUrl, model));
      
      // Add ProjectManager specifics to the result
      return {
        ...result,
        provider: 'projectManager',
        backendProvider,
        serverType: serverType || backendProvider
      };
    } catch (error) {
      logger.error(`Failed to test connection for ProjectManager using ${backendProvider}`, {
        error: error.message,
        apiUrl,
        model,
        serverType
      });
      
      return {
        success: false,
        error: `Connection to ${backendProvider} failed: ${error.message}`,
        provider: 'projectManager',
        backendProvider,
        serverType: serverType || backendProvider,
        apiUrl,
        connectionOk: false
      };
    }
  }
  
  // Test with appropriate provider
  if (provider === 'lmstudio') {
    return await testLmStudioConnection(apiUrl, model);
  } else if (provider === 'ollama') {
    return await testOllamaConnection(apiUrl, model);
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }
};

/**
 * Validate a model for a provider
 */
const validateModel = async (model, provider) => {
  return settingsService.validateModel(model, provider);
};

module.exports = {
  fetchModels,
  testConnection,
  validateModel
}; 