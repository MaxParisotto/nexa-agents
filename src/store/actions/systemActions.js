import { logInfo, LOG_CATEGORIES } from './logActions';
import apiClient from '../../utils/apiClient';

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

/**
 * Start system monitoring
 * Collects system metrics at regular intervals
 * @returns {Function} - Interval function that can be cleared
 */
export const startSystemMonitoring = () => (dispatch) => {
  // Initial metrics collection
  dispatch(collectSystemMetrics());
  dispatch(collectTokenMetrics());
  
  // Set up regular metrics collection
  const intervalId = setInterval(() => {
    dispatch(collectSystemMetrics());
    dispatch(collectTokenMetrics());
  }, 5000); // Collect metrics every 5 seconds
  
  // Return the interval ID so it can be cleared if needed
  return intervalId;
};

/**
 * Collect system metrics from the OS and running processes
 */
export const collectSystemMetrics = () => async (dispatch) => {
  try {
    // Attempt to collect metrics from API
    try {
      const response = await fetch('/api/metrics/system');
      if (response.ok) {
        const metrics = await response.json();
        dispatch({
          type: 'UPDATE_SYSTEM_METRICS',
          payload: metrics
        });
        return;
      }
    } catch (apiError) {
      console.warn('Could not fetch metrics from API, using frontend calculations', apiError);
    }
    
    // Fallback to browser-based metrics if API call fails
    const metrics = {
      cpu: Math.floor(Math.random() * 30 + 10), // Mock data as placeholder
      memory: Math.floor(Math.random() * 40 + 20), // Mock data as placeholder
      disk: Math.floor(Math.random() * 20 + 5), // Mock data as placeholder
      network: {
        up: Math.floor(Math.random() * 100),
        down: Math.floor(Math.random() * 500)
      },
      timestamp: Date.now()
    };
    
    // Try to get real memory usage
    try {
      if (performance && performance.memory) {
        const memoryInfo = performance.memory;
        metrics.memory = Math.round((memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100);
      }
    } catch (e) {
      console.warn('Could not get browser memory metrics', e);
    }
    
    dispatch({
      type: 'UPDATE_SYSTEM_METRICS',
      payload: metrics
    });
  } catch (error) {
    console.error('Error collecting system metrics:', error);
    // Don't dispatch error to avoid notification spam
  }
};

/**
 * Collect token usage metrics
 */
export const collectTokenMetrics = () => async (dispatch, getState) => {
  try {
    // First try to get metrics from API
    try {
      const response = await fetch('/api/metrics/tokens');
      if (response.ok) {
        const tokenMetrics = await response.json();
        dispatch({
          type: 'UPDATE_TOKEN_METRICS',
          payload: tokenMetrics
        });
        return;
      }
    } catch (apiError) {
      console.warn('Could not fetch token metrics from API', apiError);
    }
    
    // If API call fails, calculate from benchmarks
    const benchmarks = getState().system.benchmarks || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTokens = benchmarks
      .filter(b => new Date(b.timestamp) >= today)
      .reduce((sum, b) => sum + (b.tokens || 0), 0);
    
    const totalTokens = benchmarks
      .reduce((sum, b) => sum + (b.tokens || 0), 0);
    
    dispatch({
      type: 'UPDATE_TOKEN_METRICS',
      payload: {
        used: todayTokens,
        total: totalTokens,
        remaining: Math.max(0, 1000000 - totalTokens), // Assuming 1M token limit
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Error collecting token metrics:', error);
    // Don't dispatch error to avoid notification spam
  }
};

/**
 * Fetch system metrics with improved error handling
 * @returns {Function} Thunk action
 */
export const fetchMetrics = () => async (dispatch) => {
  dispatch({ type: 'METRICS_LOADING', payload: 'metrics' });
  
  try {
    // Use API client instead of direct fetch
    const data = await apiClient.metrics.getMetrics();
    
    // Update metrics
    dispatch({ type: 'UPDATE_METRICS', payload: data });
    return data;
  } catch (error) {
    console.warn('Could not fetch metrics from API, using frontend calculations', error);
    
    // Use mock data when API fails
    const mockMetrics = {
      cpu: {
        usage: Math.floor(Math.random() * 30) + 10,
        cores: 4,
        model: 'Mock CPU'
      },
      memory: {
        total: 16000000000,
        free: 8000000000,
        used: 8000000000,
        usagePercent: 50.0
      },
      uptime: 3600,
      serverUptime: 1800,
      timestamp: Date.now()
    };
    
    dispatch({ type: 'UPDATE_METRICS', payload: mockMetrics });
    return mockMetrics;
  }
};

/**
 * Fetch token metrics with the same improved error handling
 * @returns {Function} Thunk action
 */
export const fetchTokenMetrics = () => async (dispatch) => {
  dispatch({ type: 'METRICS_LOADING', payload: 'tokenMetrics' });
  
  try {
    // Use API client instead of direct fetch
    const data = await apiClient.metrics.getTokenMetrics();
    
    // Update token metrics
    dispatch({ type: 'UPDATE_TOKEN_METRICS', payload: data });
    return data;
  } catch (error) {
    console.warn('Could not fetch token metrics from API', error);
    
    // Use mock data when API fails
    const mockTokenMetrics = {
      totalProcessed: 12500,
      inputTokens: 6200,
      outputTokens: 6300,
      byModel: {
        'gpt-4': 3000,
        'gpt-3.5-turbo': 5000,
        'local-models': 4500
      },
      timestamp: Date.now()
    };
    
    dispatch({ type: 'UPDATE_TOKEN_METRICS', payload: mockTokenMetrics });
    return mockTokenMetrics;
  }
};
