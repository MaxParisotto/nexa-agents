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
  DELETE_WORKFLOW,
} from '../actions/systemActions';

// Counter to ensure unique IDs even when created at the same millisecond
let idCounter = 0;

/**
 * Generate a unique ID combining timestamp and counter
 * @returns {string} A unique ID
 */
const generateUniqueId = () => {
  const timestamp = Date.now();
  idCounter = (idCounter + 1) % 1000; // Reset counter after 999 to keep IDs short
  return `${timestamp}-${idCounter}`;
};

const DEFAULT_URLS = {
  lmStudio: 'http://localhost:1234',
  // Remove Ollama URL
};

const initialState = {
  notifications: [],
  errors: [],
  isLoading: false,
  status: 'idle',
  metrics: {
    cpuUsage: 0,
    memoryUsage: 0,
    activeAgents: 0,
    pendingTasks: 0
  },
  metricsHistory: [],
  tokenMetrics: {
    totalTokensGenerated: 0,
    totalTokensProcessed: 0,
    averageTokensPerSecond: 0,
    tokenHistory: [],
    modelUsage: {},
    benchmarkResults: []
  },
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
            id: generateUniqueId(),
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
            id: generateUniqueId(),
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
      // Add timestamp if not provided
      const metricsWithTimestamp = {
        ...action.payload,
        timestamp: action.payload.timestamp || new Date().toISOString()
      };
      
      // Keep only the last 50 data points for performance
      const updatedHistory = [
        ...state.metricsHistory,
        metricsWithTimestamp
      ].slice(-50);
      
      return {
        ...state,
        metrics: metricsWithTimestamp,
        metricsHistory: updatedHistory,
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
              id: action.payload.id || generateUniqueId(), // Use provided ID or generate a new one
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
      
    case UPDATE_TOKEN_METRICS:
      // Add timestamp if not provided
      const tokenMetricsWithTimestamp = {
        ...action.payload,
        timestamp: action.payload.timestamp || new Date().toISOString()
      };
      
      // Keep only the last 50 data points for performance
      const updatedTokenHistory = [
        ...state.tokenMetrics.tokenHistory,
        tokenMetricsWithTimestamp
      ].slice(-50);
      
      // Update model usage if model info is provided
      let updatedModelUsage = { ...state.tokenMetrics.modelUsage };
      if (action.payload.model) {
        const model = action.payload.model;
        const tokensGenerated = action.payload.recentTokensGenerated || 0;
        
        updatedModelUsage[model] = {
          ...updatedModelUsage[model],
          totalTokens: (updatedModelUsage[model]?.totalTokens || 0) + tokensGenerated,
          lastUsed: new Date().toISOString()
        };
      }
      
      return {
        ...state,
        tokenMetrics: {
          ...state.tokenMetrics,
          totalTokensGenerated: action.payload.totalTokensGenerated || state.tokenMetrics.totalTokensGenerated,
          totalTokensProcessed: action.payload.totalTokensProcessed || state.tokenMetrics.totalTokensProcessed,
          averageTokensPerSecond: action.payload.averageTokensPerSecond || state.tokenMetrics.averageTokensPerSecond,
          tokenHistory: updatedTokenHistory,
          modelUsage: updatedModelUsage
        },
        lastUpdated: new Date().toISOString()
      };
    
    case ADD_BENCHMARK_RESULT:
      // Add the benchmark result to the array, keeping the most recent 10
      return {
        ...state,
        tokenMetrics: {
          ...state.tokenMetrics,
          benchmarkResults: [
            action.payload,
            ...state.tokenMetrics.benchmarkResults
          ].slice(0, 10)
        },
        lastUpdated: new Date().toISOString()
      };
      
    default:
      return state;
  }
};

export default systemReducer;
