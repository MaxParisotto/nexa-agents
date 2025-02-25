const initialState = {
  status: 'idle', // idle, running, paused, error
  metrics: {
    cpuUsage: 0,
    memoryUsage: 0,
    activeAgents: 0,
    pendingTasks: 0
  },
  metricsHistory: [], // Array to store metrics history for charts
  websocketStatus: 'disconnected', // connected, disconnected, connecting
  notifications: [],
  errors: [],
  lastUpdated: null,
  workflows: [], // List of saved workflows
  activeWorkflow: null, // Currently active workflow
  workflowStatuses: {} // Map of workflow IDs to statuses
};

const systemReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'UPDATE_SYSTEM_STATUS':
      return {
        ...state,
        status: action.payload,
        lastUpdated: new Date().toISOString()
      };
    case 'UPDATE_METRICS':
      // Create a metrics data point with timestamp
      const newMetricsPoint = {
        ...action.payload,
        timestamp: new Date().toISOString()
      };

      // Keep only the last 50 data points for performance
      const updatedHistory = [
        newMetricsPoint,
        ...state.metricsHistory
      ].slice(0, 50);

      return {
        ...state,
        metrics: {
          ...state.metrics,
          ...action.payload
        },
        metricsHistory: updatedHistory,
        lastUpdated: new Date().toISOString()
      };
    case 'UPDATE_WEBSOCKET_STATUS':
      return {
        ...state,
        websocketStatus: action.payload,
        lastUpdated: new Date().toISOString()
      };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 100), // Keep last 100 notifications
        lastUpdated: new Date().toISOString()
      };
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
        lastUpdated: new Date().toISOString()
      };
    case 'ADD_ERROR':
      return {
        ...state,
        errors: [action.payload, ...state.errors],
        lastUpdated: new Date().toISOString()
      };
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
        lastUpdated: new Date().toISOString()
      };
    // Workflow action handlers
    case 'SAVE_WORKFLOW':
      const existingIndex = state.workflows.findIndex(w => w.id === action.payload.id);
      let updatedWorkflows;

      if (existingIndex >= 0) {
        // Update existing workflow
        updatedWorkflows = [
          ...state.workflows.slice(0, existingIndex),
          action.payload,
          ...state.workflows.slice(existingIndex + 1)
        ];
      } else {
        // Add new workflow
        updatedWorkflows = [...state.workflows, action.payload];
      }

      return {
        ...state,
        workflows: updatedWorkflows,
        lastUpdated: new Date().toISOString()
      };
    case 'LOAD_WORKFLOW':
      return {
        ...state,
        activeWorkflow: action.payload,
        lastUpdated: new Date().toISOString()
      };
    case 'DELETE_WORKFLOW':
      return {
        ...state,
        workflows: state.workflows.filter(w => w.id !== action.payload),
        activeWorkflow: state.activeWorkflow?.id === action.payload ? null : state.activeWorkflow,
        lastUpdated: new Date().toISOString()
      };
    case 'RUN_WORKFLOW':
      return {
        ...state,
        workflowStatuses: {
          ...state.workflowStatuses,
          [action.payload.id]: 'running'
        },
        lastUpdated: new Date().toISOString()
      };
    case 'STOP_WORKFLOW':
      return {
        ...state,
        workflowStatuses: {
          ...state.workflowStatuses,
          [action.payload]: 'stopped'
        },
        lastUpdated: new Date().toISOString()
      };
    case 'UPDATE_WORKFLOW_STATUS':
      return {
        ...state,
        workflowStatuses: {
          ...state.workflowStatuses,
          [action.payload.workflowId]: action.payload.status
        },
        lastUpdated: new Date().toISOString()
      };
    default:
      return state;
  }
};

export default systemReducer;
