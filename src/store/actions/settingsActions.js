// Action Types
export const UPDATE_SETTINGS = 'UPDATE_SETTINGS';
export const FETCH_MODELS_REQUEST = 'FETCH_MODELS_REQUEST';
export const FETCH_MODELS_SUCCESS = 'FETCH_MODELS_SUCCESS';
export const FETCH_MODELS_FAILURE = 'FETCH_MODELS_FAILURE';
export const LOAD_CONFIG_REQUEST = 'LOAD_CONFIG_REQUEST';
export const LOAD_CONFIG_SUCCESS = 'LOAD_CONFIG_SUCCESS';
export const LOAD_CONFIG_FAILURE = 'LOAD_CONFIG_FAILURE';

import axios from 'axios';
import { logInfo, logError, logWarning, LOG_CATEGORIES } from './logActions';
import { addNotification } from './systemActions';
import configService from '../../services/configService';

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

// Thunk Actions
export const fetchModels = (provider, apiUrl) => async (dispatch, getState) => {
  dispatch(fetchModelsRequest(provider));
  
  try {
    let models = [];
    
    if (provider === 'lmStudio') {
      // LM Studio API call to fetch models
      const response = await axios.get(`${apiUrl}/v1/models`);
      models = response.data.data.map(model => model.id);
      
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Successfully fetched ${models.length} models from LM Studio`));
    } 
    else if (provider === 'ollama') {
      // Ollama API call to fetch models
      const response = await axios.get(`${apiUrl}/api/tags`);
      models = response.data.models.map(model => model.name);
      
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Successfully fetched ${models.length} models from Ollama`));
    }
    else if (provider === 'projectManager') {
      // For Project Manager, we use Ollama API but we're specifically looking for DeepScaler models
      const response = await axios.get(`${apiUrl}/api/tags`);
      const allModels = response.data.models.map(model => model.name);
      
      // Filter for DeepScaler models first
      models = allModels.filter(name => 
        name.toLowerCase().includes('deepscaler') || 
        name.toLowerCase().includes('deep-scaler')
      );
      
      // If no DeepScaler models found, also look for other models with function calling capabilities
      if (models.length === 0) {
        const functionCallingModels = allModels.filter(name => 
          name.toLowerCase().includes('deepseek') || 
          name.toLowerCase().includes('llama3') ||
          name.toLowerCase().includes('llama-3') ||
          name.toLowerCase().includes('mistral') ||
          name.toLowerCase().includes('mixtral') ||
          name.toLowerCase().includes('qwen')
        );
        models = functionCallingModels;
      }
      
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Successfully fetched ${models.length} compatible models for Project Manager`));
    }
    
    dispatch(fetchModelsSuccess(provider, models));
    
    // Update connection attempts timestamp
    connectionAttempts[provider] = Date.now();
    
    return models;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;
    dispatch(logError(LOG_CATEGORIES.SETTINGS, `Failed to fetch models from ${provider}: ${errorMessage}`, error));
    dispatch(fetchModelsFailure(provider, errorMessage));
    
    // Notify user
    dispatch(addNotification({
      type: 'error',
      message: `Failed to connect to ${provider}: ${errorMessage}`
    }));
    
    return [];
  }
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
          model: config.projectManager?.model
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
  const projectManagerApiUrl = localStorage.getItem('projectManagerApiUrl') || 'http://localhost:11434';
  const projectManagerModel = localStorage.getItem('projectManagerModel') || 'deepscaler:7b';
  
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
      parameters: projectManagerParameters
    },
    nodeEnv,
    port
  };
  
  return config;
};

/**
 * Thunk action creator for saving settings
 * Saves to both localStorage and attempts to save to file
 */
export const saveSettings = (settings) => async (dispatch) => {
  try {
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Saving settings'));
    
    // Save to localStorage
    if (settings.lmStudio?.apiUrl) {
      localStorage.setItem('lmStudioAddress', settings.lmStudio.apiUrl);
    }
    
    if (settings.lmStudio?.defaultModel) {
      localStorage.setItem('defaultLmStudioModel', settings.lmStudio.defaultModel);
    }
    
    if (settings.ollama?.apiUrl) {
      localStorage.setItem('ollamaAddress', settings.ollama.apiUrl);
    }
    
    if (settings.ollama?.defaultModel) {
      localStorage.setItem('defaultOllamaModel', settings.ollama.defaultModel);
    }
    
    if (settings.projectManager?.apiUrl) {
      localStorage.setItem('projectManagerApiUrl', settings.projectManager.apiUrl);
    }
    
    if (settings.projectManager?.model) {
      localStorage.setItem('projectManagerModel', settings.projectManager.model);
    }
    
    if (settings.projectManager?.parameters) {
      localStorage.setItem('projectManagerParameters', JSON.stringify(settings.projectManager.parameters));
    }
    
    if (settings.nodeEnv) {
      localStorage.setItem('nodeEnv', settings.nodeEnv);
    }
    
    if (settings.port) {
      localStorage.setItem('port', settings.port);
    }
    
    // Update Redux store
    dispatch(updateSettings(settings));
    
    // Save to config file
    await configService.saveConfig({
      lmStudio: {
        apiUrl: settings.lmStudio?.apiUrl,
        defaultModel: settings.lmStudio?.defaultModel
      },
      ollama: {
        apiUrl: settings.ollama?.apiUrl,
        defaultModel: settings.ollama?.defaultModel
      },
      projectManager: {
        apiUrl: settings.projectManager?.apiUrl,
        model: settings.projectManager?.model,
        parameters: settings.projectManager?.parameters
      },
      nodeEnv: settings.nodeEnv,
      port: settings.port
    });
    
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Settings saved successfully'));
    
    // Notify user
    dispatch(addNotification({
      type: 'success',
      message: 'Settings saved successfully'
    }));
    
    return true;
  } catch (error) {
    dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Failed to save settings', error));
    
    // Notify user
    dispatch(addNotification({
      type: 'error',
      message: `Failed to save settings: ${error.message}`
    }));
    
    return false;
  }
};
