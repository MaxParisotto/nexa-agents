/**
 * Models Controller
 * Handles fetching models, testing connections, and model validation
 */

const logger = require('../utils/logger');
const modelsService = require('../services/modelsService');

/**
 * Get models for a specific provider
 */
const getModels = async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }
    
    const apiUrl = req.query.apiUrl;
    
    if (!apiUrl) {
      return res.status(400).json({ error: 'API URL is required' });
    }
    
    // Get serverType from query params if provided
    const serverType = req.query.serverType;
    
    // Normalize the provider name to handle case differences
    const normalizedProvider = provider.toLowerCase();
    
    logger.info(`Fetching models for ${normalizedProvider}`, { apiUrl, serverType });
    
    try {
      const models = await modelsService.fetchModels(normalizedProvider, apiUrl, serverType);
      
      // Special handling for projectManager to include server type
      if (normalizedProvider === 'projectmanager') {
        // Determine server type from URL if not provided in the request
        let effectiveServerType = serverType;
        if (!effectiveServerType) {
          const url = new URL(apiUrl);
          const port = url.port;
          effectiveServerType = 'lmStudio'; // default
          
          if (port === '11434') {
            effectiveServerType = 'ollama';
          } else if (port === '1234') {
            effectiveServerType = 'lmStudio';
          }
        }
        
        return res.status(200).json({
          provider: 'projectManager', // Use consistent casing
          models,
          serverType: effectiveServerType,
          apiUrl
        });
      }
      
      return res.status(200).json({
        provider,
        models
      });
    } catch (error) {
      // Special handling for projectManager to return empty models but not error
      if (normalizedProvider === 'projectmanager') {
        logger.warn(`Could not fetch models for projectManager, returning empty array`, { 
          error: error.message,
          apiUrl 
        });
        
        // Determine server type from URL if not provided
        let effectiveServerType = serverType;
        if (!effectiveServerType) {
          const url = new URL(apiUrl);
          const port = url.port;
          effectiveServerType = 'lmStudio'; // default
          
          if (port === '11434') {
            effectiveServerType = 'ollama';
          } else if (port === '1234') {
            effectiveServerType = 'lmStudio';
          }
        }
        
        return res.status(200).json({
          provider: 'projectManager', // Use consistent casing
          models: [],
          serverType: effectiveServerType,
          apiUrl,
          error: error.message
        });
      }
      
      throw error; // Re-throw for normal error handling
    }
  } catch (error) {
    logger.error(`Failed to fetch models for ${req.params.provider}`, { 
      error: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({ 
      error: `Failed to fetch models: ${error.message}`,
      provider: req.params.provider
    });
  }
};

/**
 * Test connection to a provider
 */
const testConnection = async (req, res) => {
  try {
    const { provider, apiUrl, model, serverType } = req.body;
    
    if (!provider || !apiUrl) {
      return res.status(400).json({ error: 'Provider and API URL are required' });
    }
    
    // Normalize provider name
    const normalizedProvider = provider.toLowerCase();
    
    logger.info(`Testing connection to ${normalizedProvider}`, { apiUrl, model, serverType });
    
    try {
      const result = await modelsService.testConnection(normalizedProvider, apiUrl, model, serverType);
      
      // Special handling for projectManager to fix the provider name
      if (normalizedProvider === 'projectmanager') {
        result.provider = 'projectManager'; // Use consistent casing
      }
      
      return res.status(200).json(result);
    } catch (error) {
      // Special handling for projectManager
      if (normalizedProvider === 'projectmanager') {
        // Provide a more user-friendly response
        logger.warn(`Connection test failed for projectManager`, { 
          error: error.message,
          apiUrl,
          model,
          serverType
        });
        
        // Determine server type - use provided serverType or derive from URL
        let effectiveServerType = serverType;
        if (!effectiveServerType) {
          const url = new URL(apiUrl);
          const port = url.port;
          effectiveServerType = 'lmStudio'; // default
          
          if (port === '11434') {
            effectiveServerType = 'ollama';
          } else if (port === '1234') {
            effectiveServerType = 'lmStudio';
          }
        }
        
        return res.status(200).json({
          success: false,
          provider: 'projectManager',
          serverType: effectiveServerType,
          apiUrl,
          error: `Connection test failed: ${error.message}`
        });
      }
      
      throw error; // Re-throw for normal error handling
    }
  } catch (error) {
    logger.error('Connection test failed', { 
      error: error.message,
      stack: error.stack,
      provider: req.body.provider,
      apiUrl: req.body.apiUrl,
      serverType: req.body.serverType
    });
    
    return res.status(500).json({ 
      success: false,
      error: `Connection test failed: ${error.message}`,
      provider: req.body.provider,
      apiUrl: req.body.apiUrl
    });
  }
};

/**
 * Validate model for a provider
 */
const validateModel = async (req, res) => {
  try {
    const { provider, model } = req.body;
    
    if (!provider || !model) {
      return res.status(400).json({ error: 'Provider and model are required' });
    }
    
    logger.info(`Validating model ${model} for ${provider}`);
    
    const validationResult = await modelsService.validateModel(model, provider);
    
    return res.status(200).json(validationResult);
  } catch (error) {
    logger.error('Model validation failed', { 
      error: error.message,
      stack: error.stack,
      provider: req.body.provider,
      model: req.body.model
    });
    
    return res.status(500).json({ 
      isValid: false,
      error: `Model validation failed: ${error.message}`,
      provider: req.body.provider,
      model: req.body.model
    });
  }
};

module.exports = {
  getModels,
  testConnection,
  validateModel
}; 