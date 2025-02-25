import {
  ADD_NOTIFICATION,
  CLEAR_NOTIFICATIONS,
  ADD_ERROR,
  CLEAR_ERRORS,
  SET_LOADING,
  UPDATE_SYSTEM_STATUS,
  UPDATE_METRICS,
  SET_WORKSPACE_PATH,
  SET_MODELS,
  UPDATE_PREFERENCE,
  LIST_WORKFLOWS,
  SAVE_WORKFLOW,
  RUN_WORKFLOW,
  DELETE_WORKFLOW,
} from '../actions/systemActions';

const initialState = {
  notifications: [],
  errors: [],
  isLoading: false,
  status: 'idle',
  systemMetrics: null,
  websocketStatus: 'disconnected',
  lastUpdated: null,
  workspacePath: null,
  models: [],
  preferences: {
    theme: 'light',
    fontSize: 14,
    language: 'en',
    apiEndpoints: {
      lmstudio: 'http://localhost:1234',
      ollama: 'http://localhost:11434'
    }
  },
  workflows: []
};

/**
 * System reducer handles application-wide state like notifications, 
 * system status, preferences, and workflow management.
 */
const systemReducer = (state = initialState, action) => {
  switch (action.type) {
    case ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...action.payload
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
            timestamp: new Date().toISOString(),
            ...action.payload
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
        isLoading: action.payload
      };
      
    case UPDATE_SYSTEM_STATUS:
      return {
        ...state,
        status: action.payload,
        lastUpdated: new Date().toISOString()
      };
      
    case UPDATE_METRICS:
      return {
        ...state,
        systemMetrics: action.payload,
        lastUpdated: new Date().toISOString()
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
          ...action.payload
        }
      };
    
    // Project Manager workflow actions
    case LIST_WORKFLOWS:
      return {
        ...state,
        workflows: action.payload
      };
      
    case SAVE_WORKFLOW:
      // Update existing workflow or add new one
      const existingIndex = state.workflows.findIndex(
        w => w.id === action.payload.id
      );
      
      if (existingIndex >= 0) {
        // Update existing workflow
        const updatedWorkflows = [...state.workflows];
        updatedWorkflows[existingIndex] = {
          ...action.payload,
          modified: new Date().toISOString()
        };
        
        return {
          ...state,
          workflows: updatedWorkflows
        };
      } else {
        // Add new workflow
        return {
          ...state,
          workflows: [
            ...state.workflows,
            {
              ...action.payload,
              created: new Date().toISOString(),
              modified: new Date().toISOString()
            }
          ]
        };
      }
      
    case RUN_WORKFLOW:
      // Update workflow status to 'running'
      return {
        ...state,
        workflows: state.workflows.map(workflow => 
          workflow.id === action.payload.id
            ? { ...workflow, status: 'running', lastRun: new Date().toISOString() }
            : workflow
        )
      };
      
    case DELETE_WORKFLOW:
      // Remove workflow from state
      return {
        ...state,
        workflows: state.workflows.filter(w => w.id !== action.payload)
      };
      
    default:
      return state;
  }
};

export default systemReducer;
