const initialState = {
  status: 'idle', // idle, running, paused, error
  metrics: {
    cpuUsage: 0,
    memoryUsage: 0,
    activeAgents: 0,
    pendingTasks: 0
  },
  websocketStatus: 'disconnected', // connected, disconnected, connecting
  notifications: [],
  errors: [],
  lastUpdated: null
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
      return {
        ...state,
        metrics: {
          ...state.metrics,
          ...action.payload
        },
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
    default:
      return state;
  }
};

export default systemReducer;
