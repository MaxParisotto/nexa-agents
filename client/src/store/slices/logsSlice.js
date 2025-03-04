import { createSlice } from '@reduxjs/toolkit';
import LogManager, { LOG_LEVELS, LOG_CATEGORIES } from '../../utils/LogManager';

const initialState = {
  logs: [],
  settings: {
    logLevel: 'info',
    maxLogEntries: 1000,
    showTimestamp: true,
    enableConsoleLogging: true,
    enableFileLogging: false,
    logFilePath: './logs',
    autoClearThreshold: 5000
  },
  filters: {
    levels: [],
    categories: [],
    search: '',
    startDate: null,
    endDate: null
  }
};

const logsSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {
    addLog: (state, action) => {
      state.logs.unshift(action.payload);
      if (state.logs.length > state.settings.maxLogEntries) {
        state.logs = state.logs.slice(0, state.settings.maxLogEntries);
      }
    },
    clearLogs: (state) => {
      state.logs = [];
      LogManager.clearLogs();
    },
    setLogSettings: (state, action) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    initializeLogs: (state) => {
      state.logs = LogManager.getAllLogs();
    }
  }
});

export const { addLog, clearLogs, setLogSettings, setFilters, initializeLogs } = logsSlice.actions;
export default logsSlice.reducer; 