// Action Types
export const UPDATE_SETTINGS = 'UPDATE_SETTINGS';
export const FETCH_MODELS_REQUEST = 'FETCH_MODELS_REQUEST';
export const FETCH_MODELS_SUCCESS = 'FETCH_MODELS_SUCCESS';
export const FETCH_MODELS_FAILURE = 'FETCH_MODELS_FAILURE';
export const LOAD_CONFIG_REQUEST = 'LOAD_CONFIG_REQUEST';
export const LOAD_CONFIG_SUCCESS = 'LOAD_CONFIG_SUCCESS';
export const LOAD_CONFIG_FAILURE = 'LOAD_CONFIG_FAILURE';
export const LOAD_MODELS_FROM_STORAGE = 'LOAD_MODELS_FROM_STORAGE';

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

export const loadModelsFromStorage = (provider) => ({
  type: LOAD_MODELS_FROM_STORAGE,
  payload: provider
});

// Thunk Actions
export const fetchModels = (provider, apiUrl, serverType = null) => async (dispatch, getState) => {
  dispatch(fetchModelsRequest(provider));
  
  // Add detailed logging
  dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Attempting to fetch models from ${provider} at ${apiUrl}${serverType ? ` (server type: ${serverType})` : ''}`));
  
  try {
    let models = [];
    
    if (provider === 'lmStudio') {
      // LM Studio API call to fetch models
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Making request to LM Studio API: ${apiUrl}/v1/models`));
      
      const response = await axios.get(`${apiUrl}/v1/models`, {
        // Add timeout and headers for better debugging
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `LM Studio API response received: ${JSON.stringify(response.data).substring(0, 100)}...`));
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        models = response.data.data.map(model => model.id);
        dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Successfully extracted ${models.length} models from LM Studio response`));
      } else {
        dispatch(logWarning(LOG_CATEGORIES.SETTINGS, `Unexpected LM Studio API response format: ${JSON.stringify(response.data).substring(0, 200)}`));
        models = [];
      }
      
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Successfully fetched ${models.length} models from LM Studio`));
    } 
    else if (provider === 'ollama') {
      // Ollama API call to fetch models
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Making request to Ollama API: ${apiUrl}/api/tags`));
      
      const response = await axios.get(`${apiUrl}/api/tags`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Ollama API response received: ${JSON.stringify(response.data).substring(0, 100)}...`));
      
      if (response.data && response.data.models && Array.isArray(response.data.models)) {
        models = response.data.models.map(model => model.name);
        dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Successfully extracted ${models.length} models from Ollama response`));
      } else {
        dispatch(logWarning(LOG_CATEGORIES.SETTINGS, `Unexpected Ollama API response format: ${JSON.stringify(response.data).substring(0, 200)}`));
        models = [];
      }
      
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Successfully fetched ${models.length} models from Ollama`));
    }
    else if (provider === 'projectManager') {
      // For Project Manager, use the specified server type to determine the API endpoint
      const effectiveServerType = serverType || 'ollama';
      
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Project Manager using server type: ${effectiveServerType}`));
      
      if (effectiveServerType === 'lmStudio') {
        // Use LM Studio API
        dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Making request to LM Studio API for Project Manager: ${apiUrl}/v1/models`));
        
        const response = await axios.get(`${apiUrl}/v1/models`, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Project Manager API response received: ${JSON.stringify(response.data).substring(0, 100)}...`));
        
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          models = response.data.data.map(model => model.id);
          dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Successfully extracted ${models.length} models from LM Studio for Project Manager`));
        } else {
          dispatch(logWarning(LOG_CATEGORIES.SETTINGS, `Unexpected LM Studio API response format for Project Manager: ${JSON.stringify(response.data).substring(0, 200)}`));
          models = [];
        }
      } else {
        // Use Ollama API
        dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Making request to Ollama API for Project Manager: ${apiUrl}/api/tags`));
        
        const response = await axios.get(`${apiUrl}/api/tags`, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Project Manager API response received: ${JSON.stringify(response.data).substring(0, 100)}...`));
        
        if (response.data && response.data.models && Array.isArray(response.data.models)) {
          const allModels = response.data.models.map(model => model.name);
          dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Extracted ${allModels.length} total models from Ollama for Project Manager`));
          
          // Instead of filtering, use all available models
          models = allModels;
          dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Using all ${models.length} available models for Project Manager`));
          
          // For backward compatibility, still prioritize certain models if they exist
          const preferredModels = allModels.filter(name => 
            name.toLowerCase().includes('deepscaler') || 
            name.toLowerCase().includes('deep-scaler') ||
            name.toLowerCase().includes('deepseek') || 
            name.toLowerCase().includes('llama3') ||
            name.toLowerCase().includes('llama-3') ||
            name.toLowerCase().includes('mistral') ||
            name.toLowerCase().includes('mixtral') ||
            name.toLowerCase().includes('qwen')
          );
          
          // If we have preferred models, put them at the top of the list
          if (preferredModels.length > 0) {
            // Remove preferred models from the main list to avoid duplicates
            const otherModels = allModels.filter(model => !preferredModels.includes(model));
            // Combine preferred models first, then other models
            models = [...preferredModels, ...otherModels];
            dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Prioritized ${preferredModels.length} preferred models for Project Manager`));
          }
        } else {
          dispatch(logWarning(LOG_CATEGORIES.SETTINGS, `Unexpected API response format for Project Manager: ${JSON.stringify(response.data).substring(0, 200)}`));
          models = [];
        }
      }
      
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, `Successfully fetched ${models.length} models for Project Manager`));
    }
    
    dispatch(fetchModelsSuccess(provider, models));
    
    // Update connection attempts timestamp
    connectionAttempts[provider] = Date.now();
    
    return models;
  } catch (error) {
    // Enhanced error logging
    const errorMessage = error.response?.data?.error || error.message;
    const statusCode = error.response?.status || 'unknown';
    const errorDetails = {
      message: errorMessage,
      status: statusCode,
      url: `${apiUrl}/${provider === 'lmStudio' || (provider === 'projectManager' && serverType === 'lmStudio') ? 'v1/models' : 'api/tags'}`,
      provider: provider,
      serverType: serverType
    };
    
    dispatch(logError(LOG_CATEGORIES.SETTINGS, `Failed to fetch models from ${provider}: ${errorMessage}`, errorDetails));
    dispatch(fetchModelsFailure(provider, errorMessage));
    
    // Notify user with more details
    dispatch(addNotification({
      type: 'error',
      message: `Failed to connect to ${provider} (${statusCode}): ${errorMessage}`
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
  const projectManagerApiUrl = localStorage.getItem('projectManagerApiUrl') || 'http://localhost:11434';
  const projectManagerModel = localStorage.getItem('projectManagerModel') || 'deepscaler:7b';
  const projectManagerServerType = localStorage.getItem('projectManagerServerType') || 'ollama';
  
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
    
    if (settings.projectManager?.serverType) {
      localStorage.setItem('projectManagerServerType', settings.projectManager.serverType);
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
    
    // Also save models to localStorage if they exist
    if (settings.lmStudio?.models?.length) {
      localStorage.setItem('lmStudioModels', JSON.stringify(settings.lmStudio.models));
    }
    if (settings.ollama?.models?.length) {
      localStorage.setItem('ollamaModels', JSON.stringify(settings.ollama.models));
    }
    if (settings.projectManager?.models?.length) {
      localStorage.setItem('projectManagerModels', JSON.stringify(settings.projectManager.models));
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
        serverType: settings.projectManager?.serverType,
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
