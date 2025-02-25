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
  // Check if we've attempted a connection recently (within 30 seconds)
  const now = Date.now();
  const lastAttempt = connectionAttempts[provider] || 0;
  const timeSinceLastAttempt = now - lastAttempt;
  
  // If we tried to connect recently and got an error, don't try again immediately
  const currentError = getState().settings[provider].error;
  if (currentError && timeSinceLastAttempt < 30000) {
    console.log(`Skipping ${provider} connection attempt - tried ${timeSinceLastAttempt}ms ago`);
    return;
  }
  
  // Update last attempt timestamp
  connectionAttempts[provider] = now;
  
  dispatch(fetchModelsRequest(provider));
  try {
    let url = '';
    if (provider === 'lmStudio') {
      url = apiUrl ? `${apiUrl}/v1/models` : 'http://localhost:1234/v1/models';
    } else if (provider === 'ollama') {
      url = apiUrl ? `${apiUrl}/api/tags` : 'http://localhost:11434/api/tags';
    }

    console.log(`Attempting to fetch models from ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    let models = [];
    if (provider === 'ollama') {
      if (data && Array.isArray(data.models)) {
        models = data.models.map(model => model.name);
      } else {
        console.error('Error: Ollama /api/tags response is not in the expected format', data);
      }
    } else if (provider === 'lmStudio') {
      if (data && data.data && Array.isArray(data.data)) {
        models = data.data.map(model => model.id);
      } else {
        console.error('Error: LM Studio /v1/models response is not in the expected format', data);
      }
    }
    dispatch(fetchModelsSuccess(provider, models));
  } catch (error) {
    console.log(`Failed to connect to ${provider} service: ${error.message}`);
    // Use a more user-friendly error message
    const errorMessage = error.name === 'AbortError' 
      ? 'Connection timed out. Service may not be running.' 
      : error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('ERR_CONNECTION_REFUSED')
        ? `Cannot connect to ${provider} service. Please ensure it is running.`
        : error.message;
    
    dispatch(fetchModelsFailure(provider, errorMessage));
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
  dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Attempting to load configuration from file'));
  
  try {
    // Use the configService to load configuration
    const config = await configService.loadConfig();
    
    // Verify the config has the required properties
    if (!config || !config.lmStudio || !config.ollama) {
      throw new Error('Invalid configuration format');
    }
    
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Configuration loaded successfully'));
    dispatch(loadConfigSuccess(config));
    
    dispatch(addNotification({
      type: 'success',
      message: 'Settings loaded successfully'
    }));
    
    return config;
  } catch (error) {
    dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Failed to load configuration', error));
    
    // Try loading from localStorage if file loading failed
    let fallbackConfig;
    
    try {
      fallbackConfig = configService.loadConfigFromLocalStorage();
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Loaded fallback configuration from localStorage'));
    } catch (localStorageError) {
      dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Failed to load from localStorage', localStorageError));
    }
    
    // If we have a fallback config with valid properties, use it
    if (fallbackConfig && fallbackConfig.lmStudio && fallbackConfig.ollama) {
      dispatch(updateSettings(fallbackConfig));
      dispatch(loadConfigSuccess(fallbackConfig));
      
      dispatch(addNotification({
        type: 'warning',
        message: 'Using configuration from localStorage due to loading error'
      }));
      
      return fallbackConfig;
    }
    
    // Otherwise use default config
    const defaultConfig = configService.getDefaultConfig();
    dispatch(updateSettings(defaultConfig));
    dispatch(loadConfigFailure(error.message || 'Failed to load configuration'));
    
    dispatch(addNotification({
      type: 'warning',
      message: 'Using default configuration due to loading error'
    }));
    
    return defaultConfig;
  }
};

/**
 * Helper function to load settings from localStorage
 */
const loadFromLocalStorage = (dispatch) => {
  dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Loading settings from localStorage'));
  
  const settings = {
    lmStudio: {
      apiUrl: localStorage.getItem('lmStudioApiUrl') || 'http://localhost:1234',
      defaultModel: localStorage.getItem('lmStudioDefaultModel') || ''
    },
    ollama: {
      apiUrl: localStorage.getItem('ollamaApiUrl') || 'http://localhost:11434',
      defaultModel: localStorage.getItem('ollamaDefaultModel') || ''
    },
    nodeEnv: localStorage.getItem('nodeEnv') || 'development',
    port: localStorage.getItem('port') || '3001'
  };
  
  dispatch(updateSettings(settings));
  dispatch(addNotification({
    type: 'info',
    message: 'Settings loaded from localStorage'
  }));
};

/**
 * Thunk action creator for saving settings
 * Saves to both localStorage and attempts to save to file
 */
export const saveSettings = (settings) => async (dispatch) => {
  // First, validate the settings object
  if (!settings || !settings.lmStudio || !settings.ollama) {
    dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Invalid settings object provided'));
    dispatch(addNotification({
      type: 'error',
      message: 'Invalid settings format, settings not saved'
    }));
    return;
  }
  
  // Update Redux store first
  dispatch(updateSettings(settings));
  dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Updating Redux store with new settings'));
  
  // Always save to localStorage to ensure persistence
  try {
    configService.saveConfigToLocalStorage(settings);
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Settings saved to localStorage'));
  } catch (localStorageError) {
    dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Failed to save to localStorage', localStorageError));
  }
  
  // Then try to save to file with configService
  try {
    // Use the configService to save configuration
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Attempting to save settings to file'));
    const result = await configService.saveConfig(settings);
    
    dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Settings saved successfully', result));
    
    if (result.error) {
      dispatch(addNotification({
        type: 'warning',
        message: 'Settings saved locally, but failed to save to file'
      }));
    } else if (result.rateLimited) {
      dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Config save was rate limited, using localStorage only'));
    } else if (result.serverUnavailable) {
      dispatch(logWarning(LOG_CATEGORIES.SETTINGS, 'Server unavailable, settings saved to localStorage only'));
      dispatch(addNotification({
        type: 'warning',
        message: 'Server unavailable, settings saved locally only'
      }));
    } else {
      dispatch(addNotification({
        type: 'success',
        message: 'Settings saved successfully'
      }));
    }
    
    return result;
  } catch (error) {
    dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Failed to save settings to file', error));
    
    dispatch(addNotification({
      type: 'warning',
      message: 'Settings saved locally, but failed to save to file: ' + error.message
    }));
    
    // Even though file save failed, we did save to localStorage and Redux
    return { success: true, localOnly: true, error: error.message };
  }
};
