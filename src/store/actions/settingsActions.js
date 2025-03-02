// Action Types
export const UPDATE_SETTINGS = 'UPDATE_SETTINGS';
export const FETCH_MODELS_REQUEST = 'FETCH_MODELS_REQUEST';
export const FETCH_MODELS_SUCCESS = 'FETCH_MODELS_SUCCESS';
export const FETCH_MODELS_FAILURE = 'FETCH_MODELS_FAILURE';
export const LOAD_CONFIG_REQUEST = 'LOAD_CONFIG_REQUEST';
export const LOAD_CONFIG_SUCCESS = 'LOAD_CONFIG_SUCCESS';
export const LOAD_CONFIG_FAILURE = 'LOAD_CONFIG_FAILURE';
export const LOAD_MODELS_FROM_STORAGE = 'LOAD_MODELS_FROM_STORAGE';
export const TOGGLE_FEATURE = 'TOGGLE_FEATURE';
export const LOAD_SETTINGS_REQUEST = 'LOAD_SETTINGS_REQUEST';
export const LOAD_SETTINGS_SUCCESS = 'LOAD_SETTINGS_SUCCESS';
export const LOAD_SETTINGS_FAILURE = 'LOAD_SETTINGS_FAILURE';

import axios from 'axios';
import { logInfo, logError, logWarning, LOG_CATEGORIES } from './logActions';
import { addNotification } from './systemActions';
import configService from '../../services/configService';
import api from '../../services/apiClient';
import modelManager from '../../utils/ModelManager';

// Track connection attempt timestamps to avoid repeated attempts
const connectionAttempts = {
  lmStudio: 0,
  ollama: 0
};

// Action Creators
export const updateSettings = (settings) => ({
  type: UPDATE_SETTINGS,
  payload: settings
});

export const fetchModelsRequest = (provider) => ({
  type: FETCH_MODELS_REQUEST,
  payload: provider
});

export const fetchModelsSuccess = (provider, models) => ({
  type: FETCH_MODELS_SUCCESS,
  payload: { provider, models }
});

export const fetchModelsFailure = (provider, error) => ({
  type: FETCH_MODELS_FAILURE,
  payload: { provider, error }
});

export const loadConfigRequest = () => ({
  type: LOAD_CONFIG_REQUEST
});

export const loadConfigSuccess = (config) => ({
  type: LOAD_CONFIG_SUCCESS,
  payload: config
});

export const loadConfigFailure = (error) => ({
  type: LOAD_CONFIG_FAILURE,
  payload: error
});

export const loadModelsFromStorage = (provider) => ({
  type: LOAD_MODELS_FROM_STORAGE,
  payload: provider
});

export const toggleFeature = (featureName, enabled) => ({
  type: TOGGLE_FEATURE,
  payload: {
    featureName,
    enabled
  }
});

export const loadSettingsRequest = () => ({
  type: LOAD_SETTINGS_REQUEST
});

export const loadSettingsSuccess = (settings) => ({
  type: LOAD_SETTINGS_SUCCESS,
  payload: settings
});

export const loadSettingsFailure = (error) => ({
  type: LOAD_SETTINGS_FAILURE,
  payload: error
});

/**
 * Update OpenAI settings
 */
export const updateOpenAISettings = (settings) => {
  return {
    type: 'UPDATE_OPENAI_SETTINGS',
    payload: settings
  };
};

// Thunk Actions
/**
 * Fetch models from the specified provider
 * 
 * @param {string} provider Provider name ('lmStudio' or 'ollama')
 * @param {string} apiUrl API URL
 * @param {boolean} forceRefresh Force refresh of cached models
 * @returns {Promise<Array>} List of models
 */
export const fetchModels = (provider, apiUrl, forceRefresh = false) => {
  return async dispatch => {
    dispatch({
      type: 'FETCH_MODELS_REQUEST',
      payload: { provider }
    });
    
    try {
      const models = await modelManager.getModels(provider, apiUrl, forceRefresh);
      
      dispatch({
        type: 'FETCH_MODELS_SUCCESS',
        payload: { provider, models }
      });
      
      return models;
    } catch (error) {
      dispatch({
        type: 'FETCH_MODELS_FAILURE',
        payload: { 
          provider, 
          error: error.message || 'Failed to fetch models' 
        }
      });
      
      return [];
    }
  };
};

export const testConnection = (provider, apiUrl, model) => {
  return async (dispatch) => {
    try {
      let result;
      try {
        // Try to test connection
        result = await api.models.testConnection(provider, apiUrl, model);
        
        // If the result contains an error property, throw it
        if (result.error) {
          throw new Error(result.error);
        }
        
        // Notify user of success
        if (result.success) {
          dispatch(addNotification({
            type: 'success',
            message: `Successfully connected to ${provider}`
          }));
        } else {
          // Connection failed but API responded
          dispatch(addNotification({
            type: 'warning',
            message: `Connection test completed with warnings`,
            description: result.message || 'See details in Settings panel'
          }));
        }
        
        return result;
      } catch (error) {
        // Handle connection test error
        const errorMessage = error.message || `Error testing connection to ${provider}`;
        
        // Show a user-friendly notification
        dispatch(addNotification({
          type: 'error',
          message: `Could not connect to ${provider}`,
          description: errorMessage.includes('Failed to fetch') ? 
            'Server is not reachable' : errorMessage
        }));
        
        // Return a failed result instead of throwing
        return {
          success: false,
          message: errorMessage,
          provider,
          apiUrl,
          model
        };
      }
    } catch (e) {
      // Last resort fallback
      return {
        success: false,
        message: 'Unexpected error testing connection'
      };
    }
  };
};

export const saveSettings = (settings) => {
  return async (dispatch) => {
    try {
      // Make sure we have valid settings to save
      if (!settings) {
        return { success: false, message: 'No settings provided' };
      }
      
      // Validate settings first - using try-catch to prevent crashes
      let validationResult = { isValid: true };
      try {
        validationResult = await api.settings.validateSettings(settings);
      } catch (error) {
        // If validation fails, log it but continue with save
        validationResult = { 
          isValid: true, 
          warnings: ["Validation skipped due to error"] 
        };
      }
      
      // Try to save settings
      try {
        await api.settings.saveSettings(settings);
        
        // Update Redux store
        dispatch(updateSettings(settings));
        
        return { success: true, validationResult };
      } catch (error) {
        // If backend save fails, save to localStorage as fallback
        // Save individual settings to localStorage
        const { lmStudio, ollama, projectManager } = settings;
        
        if (lmStudio) {
          localStorage.setItem('lmStudioAddress', lmStudio.apiUrl || '');
          localStorage.setItem('defaultLmStudioModel', lmStudio.defaultModel || '');
        }
        
        if (ollama) {
          localStorage.setItem('ollamaAddress', ollama.apiUrl || '');
          localStorage.setItem('defaultOllamaModel', ollama.defaultModel || '');
        }
        
        if (projectManager) {
          localStorage.setItem('projectManagerApiUrl', projectManager.apiUrl || '');
          localStorage.setItem('projectManagerModel', projectManager.model || '');
          localStorage.setItem('projectManagerServerType', projectManager.serverType || 'lmStudio');
          localStorage.setItem('projectManagerParameters', JSON.stringify(projectManager.parameters || {}));
        }
        
        // Update Redux store anyway
        dispatch(updateSettings(settings));
        
        return { 
          success: true, 
          savedLocally: true,
          message: 'Saved to local storage only',
          validationResult 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: 'Failed to save settings' 
      };
    }
  };
};

/**
 * Thunk action creator for loading settings from the backend API
 * Falls back to localStorage if the backend API is not available
 * @returns {Promise<object>} - Settings object
 */
export const loadSettings = () => {
  return async (dispatch) => {
    try {
      dispatch(loadSettingsRequest());
      
      let settings;
      
      try {
        // Try to load from backend first
        settings = await api.settings.loadSettings();
      } catch (error) {
        // If backend fails, load from localStorage
        dispatch(logWarning(LOG_CATEGORIES.SETTINGS, 'Using localStorage fallback'));
        
        // Get fallback settings from localStorage
        settings = {
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
          projectManager: {
            apiUrl: localStorage.getItem('projectManagerApiUrl') || 'http://localhost:11434',
            model: localStorage.getItem('projectManagerModel') || '',
            serverType: localStorage.getItem('projectManagerServerType') || 'ollama',
            parameters: JSON.parse(localStorage.getItem('projectManagerParameters') || '{}'),
            models: JSON.parse(localStorage.getItem('projectManagerModels') || '[]')
          },
          features: {
            enableFileUploads: localStorage.getItem('enableFileUploads') === 'true',
            enableVoiceInput: localStorage.getItem('enableVoiceInput') === 'true'
          },
          nodeEnv: localStorage.getItem('nodeEnv') || 'development',
          port: localStorage.getItem('port') || '3000'
        };
      }
      
      dispatch(loadSettingsSuccess(settings));
      dispatch(updateSettings(settings));
      
      return settings;
    } catch (error) {
      dispatch(loadSettingsFailure('Error loading settings'));
      return {};
    }
  };
};

/**
 * Thunk action creator for loading configuration from a file
 * Attempts to fetch the configuration file from the server,
 * with fallback to localStorage if the file is not found
 * @param {number} retryCount - Current retry attempt (internal use)
 * @returns {Promise<object>} - Configuration object
 */
export const loadConfigFromFile = (retryCount = 0) => async (dispatch) => {
  dispatch(loadConfigRequest());
  
  try {
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Loading configuration from file'));
    
    // Try to load from file first
    const config = await configService.loadConfig();
    
    if (config) {
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Configuration loaded from file'));
      
      // Update Redux store with loaded config
      dispatch(loadConfigSuccess(config));
      
      // Update settings
      dispatch(updateSettings({
        lmStudio: {
          apiUrl: config.lmStudio?.apiUrl,
          defaultModel: config.lmStudio?.defaultModel
        },
        ollama: {
          apiUrl: config.ollama?.apiUrl,
          defaultModel: config.ollama?.defaultModel
        },
        projectManager: {
          apiUrl: config.projectManager?.apiUrl,
          model: config.projectManager?.model,
          serverType: config.projectManager?.serverType || 'ollama'
        },
        nodeEnv: config.nodeEnv,
        port: config.port
      }));
      
      return config;
    } else {
      // If file loading fails, fall back to localStorage
      dispatch(logWarning(LOG_CATEGORIES.SETTINGS, 'Could not load config from file, falling back to localStorage'));
      
      const localConfig = loadFromLocalStorage(dispatch);
      dispatch(loadConfigSuccess(localConfig));
      
      return localConfig;
    }
  } catch (error) {
    dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Failed to load configuration', error));
    
    // If server is not available yet, retry a few times
    if (retryCount < 3) {
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Retrying configuration load (attempt ${retryCount + 1})`));
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return dispatch(loadConfigFromFile(retryCount + 1));
    }
    
    // Fall back to localStorage after retries
    dispatch(logWarning(LOG_CATEGORIES.SETTINGS, 'Retries exhausted, falling back to localStorage'));
    
    const localConfig = loadFromLocalStorage(dispatch);
    dispatch(loadConfigFailure(error.message));
    
    return localConfig;
  }
};

const loadFromLocalStorage = (dispatch) => {
  dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Loading configuration from localStorage'));
  
  const lmStudioAddress = localStorage.getItem('lmStudioAddress') || 'http://localhost:1234';
  const defaultLmStudioModel = localStorage.getItem('defaultLmStudioModel') || '';
  const ollamaAddress = localStorage.getItem('ollamaAddress') || 'http://localhost:11434';
  const defaultOllamaModel = localStorage.getItem('defaultOllamaModel') || '';
  const projectManagerApiUrl = localStorage.getItem('projectManagerApiUrl') || 'http://localhost:1234';
  const projectManagerModel = localStorage.getItem('projectManagerModel') || 'qwen2.5-7b-instruct-1m';
  const projectManagerServerType = localStorage.getItem('projectManagerServerType') || 'lmStudio';
  
  // Try to load parameters from localStorage
  let projectManagerParameters = {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    maxTokens: 1024,
    contextLength: 4096
  };
  
  try {
    const savedParameters = localStorage.getItem('projectManagerParameters');
    if (savedParameters) {
      projectManagerParameters = JSON.parse(savedParameters);
    }
  } catch (error) {
    console.error('Error parsing projectManagerParameters from localStorage:', error);
  }
  
  const nodeEnv = localStorage.getItem('nodeEnv') || 'development';
  const port = localStorage.getItem('port') || '5000';
  
  const config = {
    lmStudio: {
      apiUrl: lmStudioAddress,
      defaultModel: defaultLmStudioModel
    },
    ollama: {
      apiUrl: ollamaAddress,
      defaultModel: defaultOllamaModel
    },
    projectManager: {
      apiUrl: projectManagerApiUrl,
      model: projectManagerModel,
      serverType: projectManagerServerType,
      parameters: projectManagerParameters
    },
    nodeEnv,
    port
  };
  
  return config;
};

/**
 * Load models from localStorage on startup
 */
export const loadPersistedModels = () => (dispatch) => {
  try {
    // Load models for each provider
    const providers = ['lmStudio', 'ollama', 'projectManager'];
    
    providers.forEach(provider => {
      const savedModels = localStorage.getItem(`${provider}Models`);
      if (savedModels) {
        const models = JSON.parse(savedModels);
        dispatch(fetchModelsSuccess(provider, models));
      }
    });
    
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Loaded persisted models from storage'));
  } catch (error) {
    dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Failed to load persisted models', error));
  }
};
