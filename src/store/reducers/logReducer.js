import { ADD_LOG, CLEAR_LOGS, FILTER_LOGS } from '../actions/logActions';

const initialState = {
  logs: [],
  filteredLogs: [],
  filters: {
    levels: null,
    categories: null
  }
};

// Helper function to apply filters
const applyFilters = (logs, filters) => {
  if (!filters.levels && !filters.categories) {
    return logs;
  }

  return logs.filter(log => {
    const levelMatch = !filters.levels || filters.levels.includes(log.level);
    const categoryMatch = !filters.categories || filters.categories.includes(log.category);
    return levelMatch && categoryMatch;
  });
};

// Compare function to sort logs by timestamp
const compareTimestamps = (a, b) => {
  return new Date(a.timestamp) - new Date(b.timestamp);
};

const logReducer = (state = initialState, action) => {
  switch (action.type) {
    case ADD_LOG:
      const newLogs = [...state.logs, action.payload].sort(compareTimestamps);
      return {
        ...state,
        logs: newLogs,
        filteredLogs: applyFilters(newLogs, state.filters)
      };

    case CLEAR_LOGS:
      return {
        ...state,
        logs: [],
        filteredLogs: []
      };

    case FILTER_LOGS:
      const newFilters = {
        levels: action.payload.levels,
        categories: action.payload.categories
      };
      
      return {
        ...state,
        filters: newFilters,
        filteredLogs: applyFilters(state.logs, newFilters)
      };

    default:
      return state;
  }
};

export default logReducer;
