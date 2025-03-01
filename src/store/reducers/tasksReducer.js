// Action Types
const ADD_TASK = 'ADD_TASK';
const UPDATE_TASK = 'UPDATE_TASK';
const REMOVE_TASK = 'REMOVE_TASK';
const CLEAR_TASKS = 'CLEAR_TASKS';

// Initial state
const initialState = {
  tasks: [],
  activeTaskId: null
};

// Reducer function
export function taskReducer(state = initialState, action) {
  switch (action.type) {
    case ADD_TASK:
      return {
        ...state,
        tasks: [...state.tasks, action.payload]
      };
    case UPDATE_TASK:
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id ? { ...task, ...action.payload } : task
        )
      };
    case REMOVE_TASK:
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload)
      };
    case CLEAR_TASKS:
      return {
        ...state,
        tasks: []
      };
    default:
      return state;
  }
}

export default taskReducer;
