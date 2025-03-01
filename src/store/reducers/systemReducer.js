import {
  ADD_NOTIFICATION,
  CLEAR_NOTIFICATIONS,
  ADD_ERROR,
  CLEAR_ERRORS,
  SET_LOADING,
  UPDATE_SYSTEM_STATUS,
  UPDATE_METRICS,
  UPDATE_TOKEN_METRICS,
  ADD_BENCHMARK_RESULT,
  SET_WORKSPACE_PATH,
  SET_MODELS,
  UPDATE_PREFERENCE,
  LIST_WORKFLOWS,
  SAVE_WORKFLOW,
  RUN_WORKFLOW,
  DELETE_WORKFLOW
} from '../actions/systemActions';

// Initial state
const initialState = {
  loading: false,
  notifications: [],
  errors: [],
  status: 'idle',
  metrics: {
    cpu: 0,
    memory: 0,
    disk: 0,
    network: {
      sent: 0,
      received: 0
    }
  },
  tokenMetrics: {
    used: 0,
    remaining: 0,
    total: 0
  },
  benchmarks: [],
  workspacePath: '',
  models: [],
  preferences: {
    darkMode: false,
    autoSave: true
  },
  workflows: [],
  websocketStatus: 'disconnected'
};

// Reducer function
export function systemReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [
          ...state.notifications, 
          {
            id: Date.now(),
            ...action.payload,
            timestamp: new Date().toISOString()
          }
        ]
      };
    case CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: []
      };
    case ADD_ERROR:
      return {
        ...state,
        errors: [
          ...state.errors,
          {
            id: Date.now(),
            ...action.payload,
            timestamp: new Date().toISOString()
          }
        ]
      };
    case CLEAR_ERRORS:
      return {
        ...state,
        errors: []
      };
    case SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
    case UPDATE_SYSTEM_STATUS:
      return {
        ...state,
        status: action.payload
      };
    case UPDATE_METRICS:
      return {
        ...state,
        metrics: {
          ...state.metrics,
          ...action.payload
        }
      };
    case UPDATE_TOKEN_METRICS:
      return {
        ...state,
        tokenMetrics: {
          ...state.tokenMetrics,
          ...action.payload
        }
      };
    case ADD_BENCHMARK_RESULT:
      return {
        ...state,
        benchmarks: [...state.benchmarks, action.payload]
      };
    case SET_WORKSPACE_PATH:
      return {
        ...state,
        workspacePath: action.payload
      };
    case SET_MODELS:
      return {
        ...state,
        models: action.payload
      };
    case UPDATE_PREFERENCE:
      return {
        ...state,
        preferences: {
          ...state.preferences,
          [action.payload.key]: action.payload.value
        }
      };
    case LIST_WORKFLOWS:
      return {
        ...state,
        workflows: action.payload
      };
    case SAVE_WORKFLOW:
      {
        const existingIndex = state.workflows.findIndex(w => w.id === action.payload.id);
        const workflows = existingIndex >= 0 
          ? state.workflows.map(w => w.id === action.payload.id ? action.payload : w)
          : [...state.workflows, action.payload];
          
        return {
          ...state,
          workflows
        };
      }
    case RUN_WORKFLOW:
      return {
        ...state,
        workflows: state.workflows.map(workflow => 
          workflow.id === action.payload.id 
            ? { ...workflow, status: action.payload.status } 
            : workflow
        )
      };
    case DELETE_WORKFLOW:
      return {
        ...state,
        workflows: state.workflows.filter(workflow => workflow.id !== action.payload)
      };
    case 'UPDATE_WEBSOCKET_STATUS':
      return {
        ...state,
        websocketStatus: action.payload
      };
    default:
      return state;
  }
}

export default systemReducer;
