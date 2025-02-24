import { combineReducers } from 'redux';
import agentsReducer from './agentsReducer';
import tasksReducer from './tasksReducer';
import systemReducer from './systemReducer';

const rootReducer = combineReducers({
  agents: agentsReducer,
  tasks: tasksReducer,
  system: systemReducer
});

export default rootReducer;
