import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import logsReducer from './reducers/logsReducer';
import settingsReducer from './reducers/settingsReducer';
import systemReducer from './reducers/systemReducer';
import taskReducer from './reducers/tasksReducer';
import agentsReducer from './reducers/agentsReducer';

// Combine all reducers
const rootReducer = combineReducers({
  logs: logsReducer,
  settings: settingsReducer,
  system: systemReducer,
  tasks: taskReducer,
  agents: agentsReducer
});

// Create the Redux store
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

export default store;