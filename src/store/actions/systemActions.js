import { logInfo, LOG_CATEGORIES } from './logActions';

// Action Types
export const ADD_NOTIFICATION = 'ADD_NOTIFICATION';
export const CLEAR_NOTIFICATIONS = 'CLEAR_NOTIFICATIONS';
export const ADD_ERROR = 'ADD_ERROR';
export const CLEAR_ERRORS = 'CLEAR_ERRORS';
export const SET_LOADING = 'SET_LOADING';
export const UPDATE_SYSTEM_STATUS = 'UPDATE_SYSTEM_STATUS';
export const UPDATE_METRICS = 'UPDATE_METRICS';
export const UPDATE_TOKEN_METRICS = 'UPDATE_TOKEN_METRICS';
export const ADD_BENCHMARK_RESULT = 'ADD_BENCHMARK_RESULT';
export const SET_WORKSPACE_PATH = 'SET_WORKSPACE_PATH';
export const SET_MODELS = 'SET_MODELS';
export const UPDATE_PREFERENCE = 'UPDATE_PREFERENCE';
export const LIST_WORKFLOWS = 'LIST_WORKFLOWS';
export const SAVE_WORKFLOW = 'SAVE_WORKFLOW';
export const RUN_WORKFLOW = 'RUN_WORKFLOW';
export const DELETE_WORKFLOW = 'DELETE_WORKFLOW';

// Action Creators
export const addNotification = (notification) => ({
  type: ADD_NOTIFICATION,
  payload: notification
});

export const clearNotifications = () => ({
  type: CLEAR_NOTIFICATIONS
});

export const addError = (error) => ({
  type: ADD_ERROR,
  payload: error
});

export const clearErrors = () => ({
  type: CLEAR_ERRORS
});

export const setLoading = (isLoading) => ({
  type: SET_LOADING,
  payload: isLoading
});

export const updateSystemStatus = (status) => ({
  type: UPDATE_SYSTEM_STATUS,
  payload: status
});

export const updateMetrics = (metrics) => ({
  type: UPDATE_METRICS,
  payload: metrics
});

export const updateTokenMetrics = (metrics) => ({
  type: UPDATE_TOKEN_METRICS,
  payload: metrics
});

export const addBenchmarkResult = (result) => ({
  type: ADD_BENCHMARK_RESULT,
  payload: result
});

export const setWorkspacePath = (path) => ({
  type: SET_WORKSPACE_PATH,
  payload: path
});

export const setModels = (models) => ({
  type: SET_MODELS,
  payload: models
});

export const updatePreference = (key, value) => ({
  type: UPDATE_PREFERENCE,
  payload: { key, value }
});

export const updateWebsocketStatus = (status) => ({
  type: 'UPDATE_WEBSOCKET_STATUS',
  payload: status
});

// Thunk action creators
export const listWorkflowsThunk = () => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    // Implement the API call here
    const response = await fetch('/api/workflows');
    const data = await response.json();
    
    dispatch({
      type: LIST_WORKFLOWS,
      payload: data.workflows || []
    });
    return data.workflows || [];
  } catch (error) {
    dispatch(addError({
      message: 'Failed to list workflows',
      details: error.message
    }));
    return [];
  } finally {
    dispatch(setLoading(false));
  }
};

export const saveWorkflowThunk = (workflow) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    // Implement the API call here
    const response = await fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow)
    });
    const data = await response.json();
    
    dispatch({
      type: SAVE_WORKFLOW,
      payload: data.workflow
    });
    
    dispatch(addNotification({
      type: 'success',
      message: 'Workflow saved successfully',
      description: `"${workflow.name}" has been saved`
    }));
    
    return data.workflow;
  } catch (error) {
    dispatch(addError({
      message: 'Failed to save workflow',
      details: error.message
    }));
    return null;
  } finally {
    dispatch(setLoading(false));
  }
};

export const runWorkflowThunk = (workflowId) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    // Implement the API call here
    const response = await fetch(`/api/workflows/${workflowId}/run`, {
      method: 'POST'
    });
    const data = await response.json();
    
    dispatch({
      type: RUN_WORKFLOW,
      payload: { id: workflowId, status: 'running' }
    });
    
    dispatch(addNotification({
      type: 'info',
      message: 'Workflow started',
      description: `Workflow execution initiated`
    }));
    
    return true;
  } catch (error) {
    dispatch(addError({
      message: 'Failed to run workflow',
      details: error.message
    }));
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

export const deleteWorkflowThunk = (workflowId) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    // Implement the API call here
    const response = await fetch(`/api/workflows/${workflowId}`, {
      method: 'DELETE'
    });
    
    dispatch({
      type: DELETE_WORKFLOW,
      payload: workflowId
    });
    
    dispatch(addNotification({
      type: 'success',
      message: 'Workflow deleted',
      description: 'The workflow has been removed'
    }));
    
    return true;
  } catch (error) {
    dispatch(addError({
      message: 'Failed to delete workflow',
      details: error.message
    }));
    return false;
  } finally {
    dispatch(setLoading(false));
  }
};

export const stopWorkflow = (workflowId) => async (dispatch) => {
  try {
    // Implement the API call here
    const response = await fetch(`/api/workflows/${workflowId}/stop`, {
      method: 'POST'
    });
    
    dispatch(addNotification({
      type: 'info',
      message: 'Workflow stopped',
      description: 'The workflow has been stopped'
    }));
    
    return true;
  } catch (error) {
    dispatch(addError({
      message: 'Failed to stop workflow',
      details: error.message
    }));
    return false;
  }
};

export const startSystemMonitoring = () => (dispatch) => {
  const interval = setInterval(() => {
    // Implement system monitoring logic here
    // For example, fetch system metrics from API endpoint
    fetch('/api/metrics')
      .then(response => {
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return response.json();
        }
        throw new Error(`Invalid response type: ${contentType}`);
      })
      .then(data => {
        dispatch(updateMetrics(data));
      })
      .catch(error => {
        // Just log the error but don't crash
        console.error('Error fetching system metrics:', error);
      });
  }, 5000); // Poll every 5 seconds
  
  // Return the interval ID so it can be cleared later if needed
  return interval;
};
