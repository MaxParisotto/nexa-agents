import {
  UPDATE_SETTINGS,
  FETCH_MODELS_REQUEST,
  FETCH_MODELS_SUCCESS,
  FETCH_MODELS_FAILURE
} from '../actions/settingsActions';

// Try to load initial state from localStorage
const loadInitialState = () => {
  try {
    const savedSettings = localStorage.getItem('settings');
    return savedSettings ? JSON.parse(savedSettings) : null;
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
    return null;
  }
};

const initialState = {
  // Load saved settings or use defaults
  ...loadInitialState() || {
    lmStudio: {
      apiUrl: 'http://localhost:1234',
      defaultModel: '',
      models: [],
      loading: false,
      error: null
    },
    ollama: {
      apiUrl: 'http://localhost:11434',
      defaultModel: '',
      models: [],
      loading: false,
      error: null
    }
  }
};

const settingsReducer = (state = initialState, action) => {
  switch (action.type) {
    case UPDATE_SETTINGS:
      return {
        ...state,
        ...action.payload
      };
      
    case FETCH_MODELS_REQUEST:
      return {
        ...state,
        [action.payload]: {
          ...state[action.payload],
          loading: true,
          error: null
        }
      };
      
    case FETCH_MODELS_SUCCESS:
      return {
        ...state,
        [action.payload.provider]: {
          ...state[action.payload.provider],
          models: action.payload.models,
          loading: false,
          error: null
        }
      };
      
    case FETCH_MODELS_FAILURE:
      return {
        ...state,
        [action.payload.provider]: {
          ...state[action.payload.provider],
          loading: false,
          error: action.payload.error
        }
      };
      
    default:
      return state;
  }
};

export default settingsReducer;
