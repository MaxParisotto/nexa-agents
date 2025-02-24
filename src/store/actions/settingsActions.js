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
    const response = await fetch(`${apiUrl}/api/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const models = provider === 'ollama' ? data.models : data;
    dispatch(fetchModelsSuccess(provider, models));
  } catch (error) {
    dispatch(fetchModelsFailure(provider, error.message));
  }
};

export const saveSettings = (settings) => async (dispatch) => {
  try {
    // Save to localStorage
    localStorage.setItem('settings', JSON.stringify(settings));
    dispatch(updateSettings(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};
