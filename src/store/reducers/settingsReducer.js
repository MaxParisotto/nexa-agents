const initialState = {
  lmStudio: {
    apiUrl: 'http://localhost:1234',
    defaultModel: '',
    loading: false,
    error: null,
    models: []
  },
  ollama: {
    apiUrl: 'http://localhost:11434',
    defaultModel: '',
    loading: false,
    error: null,
    models: []
  },
  nodeEnv: 'development',
  port: 5000
};

const settingsReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        lmStudio: {
          ...state.lmStudio,
          apiUrl: action.payload.lmStudio.apiUrl,
          defaultModel: action.payload.lmStudio.defaultModel
        },
        ollama: {
          ...state.ollama,
          apiUrl: action.payload.ollama.apiUrl,
          defaultModel: action.payload.ollama.defaultModel
        },
        nodeEnv: action.payload.nodeEnv,
        port: action.payload.port
      };
    case 'FETCH_MODELS_REQUEST':
      return {
        ...state,
        [action.payload]: {
          ...state[action.payload],
          loading: true,
          error: null
        }
      };
    case 'FETCH_MODELS_SUCCESS':
      return {
        ...state,
        [action.payload.provider]: {
          ...state[action.payload.provider],
          loading: false,
          models: action.payload.models
        }
      };
    case 'FETCH_MODELS_FAILURE':
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
