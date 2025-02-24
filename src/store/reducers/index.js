import { combineReducers } from 'redux';
import agentsReducer from './agentsReducer';
import tasksReducer from './tasksReducer';
import systemReducer from './systemReducer';
import settingsReducer from './settingsReducer';
import logsReducer from './logsReducer';

const rootReducer = combineReducers({
  agents: agentsReducer,
  tasks: tasksReducer,
  system: systemReducer,
  settings: settingsReducer,
  logs: logsReducer
});

export default rootReducer;
