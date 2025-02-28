/**
 * Settings Service
 * Business logic for settings validation, loading, and saving
 * Moved from frontend to backend for better separation of concerns
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Config directory setup
const CONFIG_DIR = path.join(__dirname, '../../../config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'settings.json');

// Default settings configuration
const DEFAULT_SETTINGS = {
  lmStudio: {
    apiUrl: 'http://localhost:1234',
    defaultModel: 'qwen2.5-7b-instruct',
    loading: false,
    error: null,
    models: []
  },
  ollama: {
    apiUrl: 'http://localhost:11434',
    defaultModel: 'llama2',
    loading: false,
    error: null,
    models: []
  },
  projectManager: {
    apiUrl: 'http://localhost:1234',
    model: 'qwen2.5-7b-instruct',
    serverType: 'lmStudio',
    loading: false,
    error: null,
    models: [],
    parameters: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      maxTokens: 1024,
      contextLength: 4096
    }
  },
  features: {
    chatWidget: true,
    projectManagerAgent: true,
    taskManagement: true,
    loggingSystem: true,
    notifications: true,
    metrics: true,
    autoSave: true,
    debugMode: false,
    experimentalFeatures: false
  },
  nodeEnv: 'development',
  port: 3001
};

/**
 * Model validation logic moved from frontend
 */
const validateModel = (model, provider) => {
  if (!model) return { isValid: false, error: 'No model specified' };

  // List of known valid models by provider
  const validModels = {
    lmStudio: [
      'qwen2.5-7b-instruct',
      'qwen2.5-7b-instruct-1m',
      'qwen2.5-7b-chat',
      'deepseek-coder',
      'deepseek-chat',
      'llama2',
      'mistral'
    ],
    ollama: [
      'llama2',
      'mistral',
      'deepseek',
      'qwen'
    ]
  };

  // Clean up model name
  const cleanModel = model.toLowerCase().trim();

  // Check if it's in the known models list for the provider
  if (validModels[provider]) {
    const isValid = validModels[provider].some(validModel => 
      cleanModel.includes(validModel.toLowerCase()) ||
      validModel.toLowerCase().includes(cleanModel)
    );

    if (isValid) {
      return { isValid: true };
    }
  }

  // Warning for unknown models but still accept them for testing
  logger.warn(`Model "${model}" not in known valid models list for ${provider}`);
  return { isValid: true, warning: `Model "${model}" not in known list but allowed for testing` };
};

/**
 * Validate URL
 */
const isValidUrl = (url) => {
  try {
    if (!url) return false;
    
    // Allow localhost with port numbers
    if (url.startsWith('http://localhost:') || url.startsWith('https://localhost:')) {
      const parts = url.split(':');
      if (parts.length === 3) {
        const port = parseInt(parts[2], 10);
        return !isNaN(port) && port > 0 && port < 65536;
      }
      return false;
    }
    
    // For other URLs, use URL constructor
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Validate temperature (0.0 to 2.0)
 */
const isValidTemperature = (temp) => {
  return typeof temp === 'number' && temp >= 0 && temp <= 2;
};

/**
 * Validate top_p (0.0 to 1.0)
 */
const isValidTopP = (topP) => {
  return typeof topP === 'number' && topP >= 0 && topP <= 1;
};

/**
 * Load settings from file
 */
const loadSettings = async () => {
  try {
    // Check if settings file exists
    if (!fs.existsSync(CONFIG_FILE)) {
      logger.info('Settings file not found, using defaults', { path: CONFIG_FILE });
      return DEFAULT_SETTINGS;
    }

    // Read settings file
    const settingsData = fs.readFileSync(CONFIG_FILE, 'utf8');
    const settings = JSON.parse(settingsData);

    logger.info('Settings loaded successfully');
    return settings;
  } catch (error) {
    logger.error('Error loading settings', { error: error.message });
    // Return defaults in case of error
    return DEFAULT_SETTINGS;
  }
};

/**
 * Save settings to file
 */
const saveSettings = async (settings) => {
  try {
    // Ensure config directory exists
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      logger.info('Created config directory', { path: CONFIG_DIR });
    }

    // Write settings file
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(settings, null, 2), 'utf8');
    logger.info('Settings saved successfully');
    
    return true;
  } catch (error) {
    logger.error('Error saving settings', { error: error.message });
    throw error;
  }
};

/**
 * Validate settings object
 */
const validateSettings = async (settings) => {
  const errors = [];
  const warnings = [];

  // Validate LM Studio settings
  if (settings.lmStudio) {
    if (!isValidUrl(settings.lmStudio.apiUrl)) {
      errors.push({ field: 'lmStudio.apiUrl', message: 'Invalid LM Studio API URL' });
    }
    
    if (settings.lmStudio.defaultModel) {
      const modelValidation = validateModel(settings.lmStudio.defaultModel, 'lmStudio');
      if (!modelValidation.isValid) {
        errors.push({ field: 'lmStudio.defaultModel', message: modelValidation.error });
      }
      if (modelValidation.warning) {
        warnings.push({ field: 'lmStudio.defaultModel', message: modelValidation.warning });
      }
    }
  }

  // Validate Ollama settings
  if (settings.ollama) {
    if (!isValidUrl(settings.ollama.apiUrl)) {
      errors.push({ field: 'ollama.apiUrl', message: 'Invalid Ollama API URL' });
    }
    
    if (settings.ollama.defaultModel) {
      const modelValidation = validateModel(settings.ollama.defaultModel, 'ollama');
      if (!modelValidation.isValid) {
        errors.push({ field: 'ollama.defaultModel', message: modelValidation.error });
      }
      if (modelValidation.warning) {
        warnings.push({ field: 'ollama.defaultModel', message: modelValidation.warning });
      }
    }
  }

  // Validate Project Manager settings
  if (settings.projectManager) {
    if (!isValidUrl(settings.projectManager.apiUrl)) {
      errors.push({ field: 'projectManager.apiUrl', message: 'Invalid Project Manager API URL' });
    }
    
    if (settings.projectManager.model) {
      const provider = settings.projectManager.serverType || 'lmStudio';
      const modelValidation = validateModel(settings.projectManager.model, provider);
      if (!modelValidation.isValid) {
        errors.push({ field: 'projectManager.model', message: modelValidation.error });
      }
      if (modelValidation.warning) {
        warnings.push({ field: 'projectManager.model', message: modelValidation.warning });
      }
    }
    
    // Validate parameters
    if (settings.projectManager.parameters) {
      const params = settings.projectManager.parameters;
      
      if (!isValidTemperature(params.temperature)) {
        errors.push({ field: 'projectManager.parameters.temperature', message: 'Temperature must be between 0 and 2' });
      }
      
      if (!isValidTopP(params.topP)) {
        errors.push({ field: 'projectManager.parameters.topP', message: 'Top P must be between 0 and 1' });
      }
      
      if (typeof params.topK !== 'number' || params.topK < 1 || params.topK > 100) {
        errors.push({ field: 'projectManager.parameters.topK', message: 'Top K must be between 1 and 100' });
      }
      
      if (typeof params.repeatPenalty !== 'number' || params.repeatPenalty < 1 || params.repeatPenalty > 2) {
        errors.push({ field: 'projectManager.parameters.repeatPenalty', message: 'Repeat penalty must be between 1 and 2' });
      }
      
      if (typeof params.maxTokens !== 'number' || params.maxTokens < 128 || params.maxTokens > 4096) {
        errors.push({ field: 'projectManager.parameters.maxTokens', message: 'Max tokens must be between 128 and 4096' });
      }
      
      if (typeof params.contextLength !== 'number' || params.contextLength < 512 || params.contextLength > 8192) {
        errors.push({ field: 'projectManager.parameters.contextLength', message: 'Context length must be between 512 and 8192' });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Clear settings
 */
const clearSettings = async () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
      logger.info('Settings file deleted');
    } else {
      logger.info('No settings file to delete');
    }
    
    return true;
  } catch (error) {
    logger.error('Error clearing settings', { error: error.message });
    throw error;
  }
};

module.exports = {
  loadSettings,
  saveSettings,
  validateSettings,
  clearSettings,
  // Export validation helpers for reuse
  validateModel,
  isValidUrl,
  isValidTemperature,
  isValidTopP
}; 