const initialState = {
  lmStudio: {
    apiUrl: 'http://localhost:1234',
    defaultModel: 'qwen2.5-7b-instruct-1m',
    loading: false,
    error: null,
    models: []
  },
  ollama: {
    apiUrl: 'http://localhost:11434',
    defaultModel: 'deepseek-r1:1.5b',
    loading: false,
    error: null,
    models: []
  },
  projectManager: {
    apiUrl: 'http://localhost:11434',
    model: 'deepscaler:7b',
    loading: false,
    error: null,
    models: [],
    parameters: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      maxTokens: 1024,
      contextLength: 4096
    }
  },
  nodeEnv: 'development',
  port: 3001,
  configLoading: false,
  configError: null
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
        projectManager: {
          ...state.projectManager,
          apiUrl: action.payload.projectManager?.apiUrl || state.projectManager.apiUrl,
          model: action.payload.projectManager?.model || state.projectManager.model,
          parameters: action.payload.projectManager?.parameters || state.projectManager.parameters,
          models: state.projectManager.models,
          loading: state.projectManager.loading,
          error: state.projectManager.error
        },
        nodeEnv: action.payload.nodeEnv || state.nodeEnv,
        port: action.payload.port || state.port
      };
    case 'LOAD_CONFIG_REQUEST':
      return {
        ...state,
        configLoading: true,
        configError: null
      };
    case 'LOAD_CONFIG_SUCCESS':
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
        projectManager: {
          ...state.projectManager,
          apiUrl: action.payload.projectManager?.apiUrl || state.projectManager.apiUrl,
          model: action.payload.projectManager?.model || state.projectManager.model,
          parameters: action.payload.projectManager?.parameters || state.projectManager.parameters,
          models: state.projectManager.models,
          loading: state.projectManager.loading,
          error: state.projectManager.error
        },
        nodeEnv: action.payload.nodeEnv || state.nodeEnv,
        port: action.payload.port || state.port,
        configLoading: false,
        configError: null
      };
    case 'LOAD_CONFIG_FAILURE':
      return {
        ...state,
        configLoading: false,
        configError: action.payload
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
    case 'LOAD_MODELS_FROM_STORAGE':
      const savedModels = localStorage.getItem(`${action.payload}Models`);
      return {
        ...state,
        [action.payload]: {
          ...state[action.payload],
          models: savedModels ? JSON.parse(savedModels) : state[action.payload].models,
          loading: false,
          error: null
        }
      };
    default:
      return state;
  }
};

export default settingsReducer;
