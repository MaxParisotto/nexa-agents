// Action Types
export const UPDATE_SETTINGS = 'UPDATE_SETTINGS';
export const FETCH_MODELS_REQUEST = 'FETCH_MODELS_REQUEST';
export const FETCH_MODELS_SUCCESS = 'FETCH_MODELS_SUCCESS';
export const FETCH_MODELS_FAILURE = 'FETCH_MODELS_FAILURE';

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

export const saveSettings = (settings) => async (dispatch) => {
  try {
    // Save settings to localStorage
    localStorage.setItem('settings', JSON.stringify(settings));

    // Save API URLs to localStorage
    localStorage.setItem('lmStudioAddress', settings.lmStudio.apiUrl);
    localStorage.setItem('ollamaAddress', settings.ollama.apiUrl);
    localStorage.setItem('defaultLmStudioModel', settings.lmStudio.defaultModel);
    localStorage.setItem('defaultOllamaModel', settings.ollama.defaultModel);
    localStorage.setItem('nodeEnv', settings.nodeEnv);
    localStorage.setItem('port', settings.port);

    dispatch(updateSettings(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};
