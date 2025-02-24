import websocketService from '../../services/websocket';
import { addError, addNotification } from './systemActions';

// Task List Actions
export const fetchTasksRequest = () => ({
  type: 'FETCH_TASKS_REQUEST'
});

export const fetchTasksSuccess = (tasks) => ({
  type: 'FETCH_TASKS_SUCCESS',
  payload: tasks
});

export const fetchTasksFailure = (error) => ({
  type: 'FETCH_TASKS_FAILURE',
  payload: error
});

export const selectTask = (task) => ({
  type: 'SELECT_TASK',
  payload: task
});

export const updateTaskStatus = (taskId, status) => ({
  type: 'UPDATE_TASK_STATUS',
  payload: { id: taskId, status }
});

// Thunk action creators for async operations
export const fetchTasks = () => {
  return async (dispatch) => {
    dispatch(fetchTasksRequest());
    try {
      // In a real application, this would be an API call
      const mockTasks = [
        { 
          id: 1, 
          title: 'Data Analysis',
          description: 'Analyze customer data for patterns',
          status: 'pending',
          priority: 'high',
          assignedTo: null
        },
        { 
          id: 2, 
          title: 'Report Generation',
          description: 'Generate monthly performance report',
          status: 'in_progress',
          priority: 'medium',
          assignedTo: 'Agent-2'
        }
      ];
      
      dispatch(fetchTasksSuccess(mockTasks));
    } catch (error) {
      dispatch(fetchTasksFailure(error.message));
      dispatch(addError({
        type: 'task',
        message: 'Failed to fetch tasks',
        error: error.message
      }));
    }
  };
};

export const createTask = (taskData) => {
  return async (dispatch) => {
    try {
      // In a real application, this would be an API call
      const newTask = {
        ...taskData,
        id: Date.now(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      dispatch({
        type: 'ADD_TASK',
        payload: newTask
      });

      dispatch(addNotification({
        type: 'success',
        message: `Task created: ${newTask.title}`
      }));

      return newTask;
    } catch (error) {
      dispatch(addError({
        type: 'task',
        message: 'Failed to create task',
        error: error.message
      }));
      throw error;
    }
  };
};

export const assignTask = (taskId, agentId) => {
  return async (dispatch) => {
    try {
      dispatch(updateTaskStatus(taskId, 'assigning'));
      
      const assignmentData = {
        taskId,
        agentId,
        assignedAt: new Date().toISOString()
      };

      // Send assignment to WebSocket server
      websocketService.assignTask(assignmentData);
      
      dispatch(updateTaskStatus(taskId, 'assigned'));
      dispatch(addNotification({
        type: 'success',
        message: `Task ${taskId} assigned to agent ${agentId}`
      }));
    } catch (error) {
      dispatch(updateTaskStatus(taskId, 'error'));
      dispatch(addError({
        type: 'task',
        message: `Failed to assign task ${taskId}`,
        error: error.message
      }));
    }
  };
};

export const completeTask = (taskId) => {
  return async (dispatch) => {
    try {
      dispatch(updateTaskStatus(taskId, 'completing'));
      
      // In a real application, this would be an API call
      // await api.completeTask(taskId);
      
      dispatch({
        type: 'COMPLETE_TASK',
        payload: { id: taskId }
      });

      dispatch(addNotification({
        type: 'success',
        message: `Task ${taskId} completed`
      }));
    } catch (error) {
      dispatch(updateTaskStatus(taskId, 'error'));
      dispatch(addError({
        type: 'task',
        message: `Failed to complete task ${taskId}`,
        error: error.message
      }));
    }
  };
};
