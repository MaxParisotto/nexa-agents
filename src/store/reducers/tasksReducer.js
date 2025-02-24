const initialState = {
  tasks: [],
  loading: false,
  error: null,
  selectedTask: null,
  taskQueue: [],
  completedTasks: []
};

const tasksReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_TASKS_REQUEST':
      return {
        ...state,
        loading: true
      };
    case 'FETCH_TASKS_SUCCESS':
      return {
        ...state,
        loading: false,
        tasks: action.payload,
        error: null
      };
    case 'FETCH_TASKS_FAILURE':
      return {
        ...state,
        loading: false,
        error: action.payload
      };
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...state.tasks, action.payload],
        taskQueue: [...state.taskQueue, action.payload.id]
      };
    case 'UPDATE_TASK_STATUS':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id
            ? { ...task, status: action.payload.status }
            : task
        )
      };
    case 'COMPLETE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(task =>
          task.id === action.payload.id
            ? { ...task, completed: true }
            : task
        ),
        completedTasks: [...state.completedTasks, action.payload.id],
        taskQueue: state.taskQueue.filter(id => id !== action.payload.id)
      };
    case 'SELECT_TASK':
      return {
        ...state,
        selectedTask: action.payload
      };
    default:
      return state;
  }
};

export default tasksReducer;
