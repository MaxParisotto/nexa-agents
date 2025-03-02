import {
  UPDATE_SETTINGS,
  FETCH_MODELS_REQUEST,
  FETCH_MODELS_SUCCESS,
  FETCH_MODELS_FAILURE,
  LOAD_CONFIG_REQUEST,
  LOAD_CONFIG_SUCCESS,
  LOAD_CONFIG_FAILURE,
  LOAD_MODELS_FROM_STORAGE,
  TOGGLE_FEATURE,
  LOAD_SETTINGS_REQUEST,
  LOAD_SETTINGS_SUCCESS,
  LOAD_SETTINGS_FAILURE,
  UPDATE_LM_STUDIO_SETTINGS,
  UPDATE_OLLAMA_SETTINGS,
  LOAD_PERSISTED_MODELS,
  UPDATE_GENERAL_SETTINGS,
  UPDATE_FEATURES
} from '../actions/settingsActions.js';

// Action types
const LOAD_SETTINGS = 'LOAD_SETTINGS';
const UPDATE_SETTING = 'UPDATE_SETTING';
const LOAD_MODELS = 'LOAD_MODELS';

// Initial state
const initialState = {
  loading: true,
  apiEndpoint: 'http://localhost:3001/api',
  models: [],
  theme: 'light',
  language: 'en',
  apiKey: '',
  // Add more settings as needed
  lmStudio: {
    apiUrl: localStorage.getItem('lmStudioAddress') || 'http://localhost:1234',
    defaultModel: localStorage.getItem('defaultLmStudioModel') || '',
    models: [],
    loading: false,
    error: null
  },
  ollama: {
    apiUrl: localStorage.getItem('ollamaAddress') || 'http://localhost:11434',
    defaultModel: localStorage.getItem('defaultOllamaModel') || '',
    models: [],
    loading: false,
    error: null
  },
  projectManager: {
    apiUrl: localStorage.getItem('projectManagerApiUrl') || 'http://localhost:11434',
    model: localStorage.getItem('projectManagerModel') || '',
    serverType: localStorage.getItem('projectManagerServerType') || 'ollama',
    parameters: JSON.parse(localStorage.getItem('projectManagerParameters') || '{}'),
    models: [],
    loading: false,
    error: null
  },
  features: {
    enableFileUploads: localStorage.getItem('enableFileUploads') === 'true',
    enableVoiceInput: localStorage.getItem('enableVoiceInput') === 'true'
  },
  nodeEnv: localStorage.getItem('nodeEnv') || 'development',
  port: localStorage.getItem('port') || '3000',
  configLoading: false,
  configError: null,
  loading: false,
  error: null,
  general: {
    applicationName: 'Nexa Agents',
    theme: 'light',
    telemetryEnabled: true,
    autoSave: true,
    autoSaveInterval: 5,
    maxHistoryItems: 50
  },
  features: {
    experimentalWorkflows: false,
    advancedAgentConfig: false,
    multiModelInference: true,
    collaborativeEditing: false,
    debugTools: false,
    dataVisualization: true,
    cloudSync: false,
    remoteExecution: false
  },
  // Add OpenAI Uplink settings
  openaiUplink: {
    enabled: true,
    port: 3002,
    requireApiKey: true,
    apiKey: localStorage.getItem('openaiUplinkApiKey') || '',
    allowedActions: ['echo', 'systemInfo', 'queryAgent'],
    customActions: []
  }
};

// Load any persisted settings from localStorage
try {
  const generalSettings = localStorage.getItem('generalSettings');
  if (generalSettings) {
    initialState.general = { ...initialState.general, ...JSON.parse(generalSettings) };
  }
  
  const featureSettings = localStorage.getItem('featureSettings');
  if (featureSettings) {
    initialState.features = { ...initialState.features, ...JSON.parse(featureSettings) };
  }
} catch (error) {
  console.error('Error loading persisted settings:', error);
}

const validateModel = (model) => {
  if (!model) return '';
  return model;
};

// Reducer function
export function settingsReducer(state = initialState, action) {
  switch (action.type) {
    case LOAD_SETTINGS:
      return {
        ...state,
        ...action.payload,
        loading: false
      };
    case UPDATE_SETTING:
      return {
        ...state,
        [action.payload.key]: action.payload.value
      };
    case LOAD_MODELS:
      return {
        ...state,
        models: action.payload
      };
    case UPDATE_SETTINGS: {
      // Validate model names before updating state
      const lmStudioModel = validateModel(action.payload.lmStudio?.defaultModel) || state.lmStudio.defaultModel;
      const ollamaModel = validateModel(action.payload.ollama?.defaultModel) || state.ollama.defaultModel;
      const projectManagerModel = validateModel(action.payload.projectManager?.model) || state.projectManager.model;
      
      return {
        ...state,
        lmStudio: {
          ...state.lmStudio,
          ...(action.payload.lmStudio || {}),
          defaultModel: lmStudioModel
        },
        ollama: {
          ...state.ollama,
          ...(action.payload.ollama || {}),
          defaultModel: ollamaModel
        },
        projectManager: {
          ...state.projectManager,
          ...(action.payload.projectManager || {}),
          model: projectManagerModel
        },
        features: {
          ...state.features,
          ...(action.payload.features || {})
        },
        nodeEnv: action.payload.nodeEnv || state.nodeEnv,
        port: action.payload.port || state.port
      };
    }
    
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
      
    case LOAD_CONFIG_REQUEST:
      return {
        ...state,
        configLoading: true,
        configError: null
      };
      
    case LOAD_CONFIG_SUCCESS: {
      // Validate model names
      const lmStudioModel = validateModel(action.payload.lmStudio?.defaultModel) || state.lmStudio.defaultModel;
      const ollamaModel = validateModel(action.payload.ollama?.defaultModel) || state.ollama.defaultModel;
      const projectManagerModel = validateModel(action.payload.projectManager?.model) || state.projectManager.model;
      
      return {
        ...state,
        lmStudio: {
          ...state.lmStudio,
          apiUrl: action.payload.lmStudio?.apiUrl || state.lmStudio.apiUrl,
          defaultModel: lmStudioModel
        },
        ollama: {
          ...state.ollama,
          apiUrl: action.payload.ollama?.apiUrl || state.ollama.apiUrl,
          defaultModel: ollamaModel
        },
        projectManager: {
          ...state.projectManager,
          apiUrl: action.payload.projectManager?.apiUrl || state.projectManager.apiUrl,
          model: projectManagerModel,
          serverType: action.payload.projectManager?.serverType || state.projectManager.serverType,
          parameters: action.payload.projectManager?.parameters || state.projectManager.parameters
        },
        nodeEnv: action.payload.nodeEnv || state.nodeEnv,
        port: action.payload.port || state.port,
        configLoading: false,
        configError: null
      };
    }
    
    case LOAD_CONFIG_FAILURE:
      return {
        ...state,
        configLoading: false,
        configError: action.payload
      };
      
    case LOAD_MODELS_FROM_STORAGE: {
      const provider = action.payload;
      const modelsKey = `${provider}Models`;
      const storedModels = localStorage.getItem(modelsKey);
      
      if (storedModels) {
        try {
          const parsedModels = JSON.parse(storedModels);
          
          return {
            ...state,
            [provider]: {
              ...state[provider],
              models: parsedModels
            }
          };
        } catch (e) {
          console.error(`Error parsing stored models for ${provider}:`, e);
        }
      }
      
      return state;
    }
    
    case TOGGLE_FEATURE:
      return {
        ...state,
        features: {
          ...state.features,
          [action.payload.featureName]: action.payload.enabled
        }
      };
      
    case LOAD_SETTINGS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
    
    case LOAD_SETTINGS_SUCCESS:
      return {
        ...state,
        ...action.payload,
        loading: false,
        error: null
      };
    
    case LOAD_SETTINGS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };

    case 'UPDATE_OPENAI_SETTINGS':
      return {
        ...state,
        openai: {
          ...state.openai,
          ...action.payload
        }
      };

    case UPDATE_GENERAL_SETTINGS:
      return {
        ...state,
        general: {
          ...state.general,
          ...action.payload
        }
      };

    case UPDATE_FEATURES:
      return {
        ...state,
        features: {
          ...state.features,
          ...action.payload
        }
      };

    case 'UPDATE_OPENAI_UPLINK_SETTINGS':
      // Save API key to localStorage if it exists
      if (action.payload.apiKey) {
        localStorage.setItem('openaiUplinkApiKey', action.payload.apiKey);
      }
      
      return {
        ...state,
        openaiUplink: {
          ...state.openaiUplink,
          ...action.payload
        }
      };
      
    default:
      return state;
  }
}

// Selector: Get LLM server configurations as array
export const selectLLMServers = (state) => [
  { 
    id: 'lmStudio',
    name: 'LM Studio',
    type: 'lmStudio',
    ...(state.settings.lmStudio || {}),
    models: state.settings.lmStudio?.models || []
  },
  {
    id: 'ollama',
    name: 'Ollama',
    type: 'ollama',
    ...(state.settings.ollama || {}),
    models: state.settings.ollama?.models || []
  },
  {
    id: 'projectManager',
    name: 'Project Manager',
    type: 'projectManager', 
    ...(state.settings.projectManager || {}),
    models: state.settings.projectManager?.models || []
  }
];

// Selector: Get all available models across providers with safety checks
export const selectAvailableModels = (state) => {
  const { lmStudio = {}, ollama = {}, projectManager = {} } = state.settings || {};
  return [
    ...(lmStudio.models || []).map(m => ({...m, provider: 'lmStudio'})),
    ...(ollama.models || []).map(m => ({...m, provider: 'ollama'})),
    ...(projectManager.models || []).map(m => ({...m, provider: 'projectManager'}))
  ];
};

export default settingsReducer;
