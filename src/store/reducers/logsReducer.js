import {
  LOG_INFO,
  LOG_WARNING,
  LOG_ERROR,
  LOG_DEBUG,
  UPDATE_LOG_SETTINGS,
  CLEAR_LOGS,
  FILTER_LOGS, // Changed from SET_LOG_FILTER to FILTER_LOGS
  LOG_LEVELS,
  LOG_CATEGORIES
} from '../actions/logActions.js';

// Load saved log settings from localStorage if available
let initialLogSettings = {
  logLevel: 'info',
  maxLogEntries: 1000,
  showTimestamp: true,
  enableConsoleLogging: true,
  enableFileLogging: false,
  logFilePath: './logs',
  autoClearThreshold: 5000
};

try {
  const savedSettings = localStorage.getItem('logSettings');
  if (savedSettings) {
    initialLogSettings = { ...initialLogSettings, ...JSON.parse(savedSettings) };
  }
} catch (error) {
  console.error('Error loading saved log settings:', error);
}

const initialState = {
  logs: [],
  settings: initialLogSettings,
  filters: {
    levels: Object.values(LOG_LEVELS),
    categories: Object.values(LOG_CATEGORIES),
    search: '',
    startDate: null,
    endDate: null
  },
  maxLogs: 1000 // Maximum number of logs to keep
};

// Logs reducer
const logsReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOG_INFO:
    case LOG_WARNING:
    case LOG_ERROR:
    case LOG_DEBUG: {
      const newLogs = [action.payload, ...state.logs];
      // Keep only the latest maxLogs
      if (newLogs.length > state.maxLogs) {
        newLogs.length = state.maxLogs;
      }
      return {
        ...state,
        logs: newLogs
      };
    }

    case UPDATE_LOG_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };

    case CLEAR_LOGS:
      return {
        ...state,
        logs: []
      };

    case FILTER_LOGS: // Changed from SET_LOG_FILTER to FILTER_LOGS
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload
        }
      };

    default:
      return state;
  }
};

// Selector to get filtered logs
export const getFilteredLogs = (state) => {
  const { logs, filters } = state;
  
  return logs.filter(log => {
    // Filter by level
    if (!filters.levels.includes(log.level)) {
      return false;
    }

    // Filter by category
    if (!filters.categories.includes(log.category)) {
      return false;
    }

    // Filter by date range
    if (filters.startDate && new Date(log.timestamp) < new Date(filters.startDate)) {
      return false;
    }
    if (filters.endDate && new Date(log.timestamp) > new Date(filters.endDate)) {
      return false;
    }

    // Filter by search text
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const messageMatch = log.message.toLowerCase().includes(searchLower);
      const detailsMatch = log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower);
      if (!messageMatch && !detailsMatch) {
        return false;
      }
    }

    return true;
  });
};

export default logsReducer;
