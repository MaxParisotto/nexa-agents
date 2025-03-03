export const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

export const LOG_CATEGORIES = {
  SYSTEM: 'SYSTEM',
  APPLICATION: 'APPLICATION',
  NETWORK: 'NETWORK'
};

export const clearLogs = () => ({
  type: 'CLEAR_LOGS'
});

export const filterLogs = (filter) => ({
  type: 'FILTER_LOGS',
  payload: filter
});
