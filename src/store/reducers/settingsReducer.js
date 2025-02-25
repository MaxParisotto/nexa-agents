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
  port: 3001
};

const settingsReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        lmStudio: {
          ...state.lmStudio,
          apiUrl: action.payload.lmStudio?.apiUrl || state.lmStudio.apiUrl,
          defaultModel: action.payload.lmStudio?.defaultModel || state.lmStudio.defaultModel,
          models: state.lmStudio.models,
          loading: state.lmStudio.loading,
          error: state.lmStudio.error
        },
        ollama: {
          ...state.ollama,
          apiUrl: action.payload.ollama?.apiUrl || state.ollama.apiUrl,
          defaultModel: action.payload.ollama?.defaultModel || state.ollama.defaultModel,
          models: state.ollama.models,
          loading: state.ollama.loading,
          error: state.ollama.error
        },
        nodeEnv: action.payload.nodeEnv || state.nodeEnv,
        port: action.payload.port || state.port
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
          models: action.payload.models,
          error: null
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
