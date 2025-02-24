// Action Types
export const UPDATE_SETTINGS = 'UPDATE_SETTINGS';
export const FETCH_MODELS_REQUEST = 'FETCH_MODELS_REQUEST';
export const FETCH_MODELS_SUCCESS = 'FETCH_MODELS_SUCCESS';
export const FETCH_MODELS_FAILURE = 'FETCH_MODELS_FAILURE';


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
export const fetchModels = (provider, apiUrl) => async (dispatch) => {
  dispatch(fetchModelsRequest(provider));
  try {
    let url = '';
    if (provider === 'lmStudio') {
      url = 'http://localhost:1234/v1/models';
    } else if (provider === 'ollama') {
      url = 'http://localhost:11434/api/tags';
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      // Set a short timeout to avoid long waits
      signal: AbortSignal.timeout(2000)
    });

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
    dispatch(fetchModelsFailure(provider, error.message));
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
