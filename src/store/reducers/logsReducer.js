import {
  ADD_LOG,
  CLEAR_LOGS,
  FILTER_LOGS, // Changed from SET_LOG_FILTER to FILTER_LOGS
  LOG_LEVELS,
  LOG_CATEGORIES
} from '../actions/logActions.js';

export const logReducer = (state = {
  logs: [],
  filters: {
    levels: Object.values(LOG_LEVELS),
    categories: Object.values(LOG_CATEGORIES),
    search: '',
    startDate: null,
    endDate: null
  },
  maxLogs: 1000 // Maximum number of logs to keep
}, action) => {
  switch (action.type) {
    case ADD_LOG: {
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

export default logReducer;
