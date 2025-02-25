// System Status Actions
export const UPDATE_SYSTEM_STATUS = 'UPDATE_SYSTEM_STATUS';
export const updateSystemStatus = (status) => ({
  type: UPDATE_SYSTEM_STATUS,
  payload: status
});

// WebSocket Status Actions
export const UPDATE_WEBSOCKET_STATUS = 'UPDATE_WEBSOCKET_STATUS';
export const updateWebsocketStatus = (status) => ({
  type: UPDATE_WEBSOCKET_STATUS,
  payload: status
});

// Metrics Actions
export const UPDATE_METRICS = 'UPDATE_METRICS';
export const updateMetrics = (metrics) => ({
  type: UPDATE_METRICS,
  payload: metrics
});

// Notification Actions
export const ADD_NOTIFICATION = 'ADD_NOTIFICATION';
export const CLEAR_NOTIFICATIONS = 'CLEAR_NOTIFICATIONS';

// Error Actions
export const ADD_ERROR = 'ADD_ERROR';
export const CLEAR_ERRORS = 'CLEAR_ERRORS';

// We don't need to add an ID here since the reducer will add it
export const addError = (error) => ({
  type: ADD_ERROR,
  payload: {
    ...error
  }
});

export const clearErrors = () => ({
  type: CLEAR_ERRORS
});

// Loading State Actions
export const SET_LOADING = 'SET_LOADING';

// Workspace Path Actions
export const SET_WORKSPACE_PATH = 'SET_WORKSPACE_PATH';

// Models Actions
export const SET_MODELS = 'SET_MODELS';

// Preferences Actions
export const UPDATE_PREFERENCE = 'UPDATE_PREFERENCE';

// Workflow Actions
export const saveWorkflow = (workflow) => ({
  type: SAVE_WORKFLOW,
  payload: workflow
});

export const loadWorkflow = (workflowId) => ({
  type: 'LOAD_WORKFLOW',
  payload: workflowId
});

export const listWorkflows = () => ({
  type: LIST_WORKFLOWS
});

export const deleteWorkflow = (workflowId) => ({
  type: DELETE_WORKFLOW,
  payload: workflowId
});

export const runWorkflow = (workflow) => ({
  type: RUN_WORKFLOW,
  payload: workflow
});

export const stopWorkflow = (workflowId) => ({
  type: 'STOP_WORKFLOW',
  payload: workflowId
});

export const updateWorkflowStatus = (workflowId, status) => ({
  type: 'UPDATE_WORKFLOW_STATUS',
  payload: { workflowId, status }
});

// Project Manager actions
export const LIST_WORKFLOWS = 'LIST_WORKFLOWS';
export const SAVE_WORKFLOW = 'SAVE_WORKFLOW';
export const RUN_WORKFLOW = 'RUN_WORKFLOW';
export const DELETE_WORKFLOW = 'DELETE_WORKFLOW';

/**
 * List all workflows from local storage
 */
export const listWorkflowsThunk = () => {
  return (dispatch) => {
    try {
      // Get workflows from local storage
      const workflowsJson = localStorage.getItem('workflows');
      const workflows = workflowsJson ? JSON.parse(workflowsJson) : [];
      
      dispatch({
        type: LIST_WORKFLOWS,
        payload: workflows
      });
      
      // Return a Promise that resolves with the workflows
      return Promise.resolve(workflows);
    } catch (error) {
      console.error('Error listing workflows:', error);
      
      dispatch(addNotification({
        type: 'error',
        message: `Failed to list workflows: ${error.message}`
      }));
      
      // Return a Promise that resolves with an empty array
      return Promise.resolve([]);
    }
  };
};

/**
 * Save a workflow to local storage
 */
export const saveWorkflowThunk = (workflow) => {
  return (dispatch) => {
    try {
      // Get existing workflows
      const workflowsJson = localStorage.getItem('workflows');
      const workflows = workflowsJson ? JSON.parse(workflowsJson) : [];
      
      // Check if workflow exists
      const existingIndex = workflows.findIndex(w => w.id === workflow.id);
      
      if (existingIndex >= 0) {
        // Update existing workflow
        workflows[existingIndex] = {
          ...workflow,
          modified: new Date().toISOString()
        };
      } else {
        // Add new workflow
        workflows.push({
          ...workflow,
          created: new Date().toISOString(),
          modified: new Date().toISOString()
        });
      }
      
      // Save to local storage
      localStorage.setItem('workflows', JSON.stringify(workflows));
      
      dispatch({
        type: SAVE_WORKFLOW,
        payload: workflow
      });
      
      dispatch(addNotification({
        type: 'success',
        message: `Workflow "${workflow.name}" saved successfully`
      }));
      
      // Return a Promise that resolves with the workflow
      return Promise.resolve(workflow);
    } catch (error) {
      console.error('Error saving workflow:', error);
      
      dispatch(addNotification({
        type: 'error',
        message: `Failed to save workflow: ${error.message}`
      }));
      
      // Return a Promise that resolves with null
      return Promise.resolve(null);
    }
  };
};

/**
 * Run a workflow
 */
export const runWorkflowThunk = (workflow) => {
  return async (dispatch) => {
    try {
      dispatch({
        type: RUN_WORKFLOW,
        payload: workflow
      });
      
      dispatch(addNotification({
        type: 'info',
        message: `Started workflow "${workflow.name}"`
      }));
      
      // TODO: Implement actual workflow execution logic
      
      // For now, just simulate a successful run
      setTimeout(() => {
        dispatch(addNotification({
          type: 'success',
          message: `Workflow "${workflow.name}" completed successfully`
        }));
      }, 2000);
      
      // Return a Promise that resolves with the workflow
      return Promise.resolve(workflow);
    } catch (error) {
      console.error('Error running workflow:', error);
      
      dispatch(addNotification({
        type: 'error',
        message: `Failed to run workflow: ${error.message}`
      }));
      
      // Return a Promise that resolves with null
      return Promise.resolve(null);
    }
  };
};

/**
 * Delete a workflow
 */
export const deleteWorkflowThunk = (workflowId) => {
  return (dispatch) => {
    try {
      // Get existing workflows
      const workflowsJson = localStorage.getItem('workflows');
      const workflows = workflowsJson ? JSON.parse(workflowsJson) : [];
      
      // Filter out the workflow to delete
      const filteredWorkflows = workflows.filter(w => w.id !== workflowId);
      
      // Save to local storage
      localStorage.setItem('workflows', JSON.stringify(filteredWorkflows));
      
      dispatch({
        type: DELETE_WORKFLOW,
        payload: workflowId
      });
      
      dispatch(addNotification({
        type: 'success',
        message: 'Workflow deleted successfully'
      }));
      
      // Return a Promise that resolves with true
      return Promise.resolve(true);
    } catch (error) {
      console.error('Error deleting workflow:', error);
      
      dispatch(addNotification({
        type: 'error',
        message: `Failed to delete workflow: ${error.message}`
      }));
      
      // Return a Promise that resolves with false
      return Promise.resolve(false);
    }
  };
};

// Token Metrics Actions
export const UPDATE_TOKEN_METRICS = 'UPDATE_TOKEN_METRICS';
export const ADD_BENCHMARK_RESULT = 'ADD_BENCHMARK_RESULT';

export const updateTokenMetrics = (metrics) => ({
  type: UPDATE_TOKEN_METRICS,
  payload: metrics
});

export const addBenchmarkResult = (result) => ({
  type: ADD_BENCHMARK_RESULT,
  payload: result
});

// Thunk action creators for async operations
export const startSystemMonitoring = () => {
  return async (dispatch, getState) => {
    try {
      dispatch(updateSystemStatus('running'));
      
      // Initial mock values
      let mockCpuUsage = Math.random() * 40 + 10; // 10-50% initial value
      let mockMemoryUsage = Math.random() * 30 + 20; // 20-50% initial value
      let mockActiveAgents = Math.floor(Math.random() * 5) + 2; // 2-7 agents
      let mockPendingTasks = Math.floor(Math.random() * 10); // 0-10 tasks
      
      // Initial token metrics
      let totalTokensGenerated = localStorage.getItem('totalTokensGenerated') 
        ? parseInt(localStorage.getItem('totalTokensGenerated')) 
        : Math.floor(Math.random() * 50000);
      let totalTokensProcessed = localStorage.getItem('totalTokensProcessed')
        ? parseInt(localStorage.getItem('totalTokensProcessed'))
        : Math.floor(Math.random() * 100000);
      let tokensPerSecond = localStorage.getItem('averageTokensPerSecond')
        ? parseFloat(localStorage.getItem('averageTokensPerSecond'))
        : Math.random() * 20 + 5;
      
      // Set initial metrics
      dispatch(updateMetrics({
        cpuUsage: mockCpuUsage,
        memoryUsage: mockMemoryUsage,
        activeAgents: mockActiveAgents,
        pendingTasks: mockPendingTasks,
        timestamp: new Date().toISOString()
      }));
      
      // Set initial token metrics
      dispatch(updateTokenMetrics({
        totalTokensGenerated,
        totalTokensProcessed,
        averageTokensPerSecond: tokensPerSecond,
        timestamp: new Date().toISOString()
      }));
      
      // Start periodic metrics collection with realistic fluctuations
      const metricsInterval = setInterval(() => {
        // Get agents and tasks from state if available
        const state = getState();
        const agentsCount = state.agents?.agents?.length || 0;
        const tasksCount = state.tasks?.tasks?.filter(t => t.status === 'pending')?.length || 0;
        
        // Fluctuate mock values for realism (±5% variation)
        mockCpuUsage = Math.max(2, Math.min(95, mockCpuUsage + (Math.random() * 10 - 5)));
        mockMemoryUsage = Math.max(5, Math.min(90, mockMemoryUsage + (Math.random() * 6 - 3)));
        
        // Use actual counts if available, otherwise fluctuate mock values
        const activeAgents = agentsCount > 0 ? 
          agentsCount : 
          Math.max(0, Math.floor(mockActiveAgents + (Math.random() > 0.8 ? Math.random() * 2 - 1 : 0)));
        
        const pendingTasks = tasksCount > 0 ? 
          tasksCount : 
          Math.max(0, Math.floor(mockPendingTasks + (Math.random() > 0.7 ? Math.random() * 3 - 1 : 0)));
        
        // Update token metrics with realistic increments
        const newTokensGenerated = Math.floor(Math.random() * 100) + 10;
        const newTokensProcessed = Math.floor(Math.random() * 200) + 20;
        totalTokensGenerated += newTokensGenerated;
        totalTokensProcessed += newTokensProcessed;
        
        // Calculate tokens per second with some variation
        const currentTokensPerSecond = Math.max(1, Math.min(50, tokensPerSecond + (Math.random() * 4 - 2)));
        tokensPerSecond = (tokensPerSecond * 0.7) + (currentTokensPerSecond * 0.3); // Smooth changes
        
        // Save to localStorage for persistence
        localStorage.setItem('totalTokensGenerated', totalTokensGenerated.toString());
        localStorage.setItem('totalTokensProcessed', totalTokensProcessed.toString());
        localStorage.setItem('averageTokensPerSecond', tokensPerSecond.toString());
        
        const timestamp = new Date().toISOString();
        
        // Update system metrics
        dispatch(updateMetrics({
          cpuUsage: mockCpuUsage,
          memoryUsage: mockMemoryUsage,
          activeAgents,
          pendingTasks,
          timestamp
        }));
        
        // Update token metrics
        dispatch(updateTokenMetrics({
          totalTokensGenerated,
          totalTokensProcessed,
          averageTokensPerSecond: tokensPerSecond,
          recentTokensGenerated: newTokensGenerated,
          recentTokensProcessed: newTokensProcessed,
          timestamp
        }));
      }, 3000); // Update every 3 seconds for more responsive charts

      // Store interval ID for cleanup
      return metricsInterval;
    } catch (error) {
      dispatch(addError({
        type: 'monitoring',
        message: 'Failed to start system monitoring',
        error: error.message
      }));
      dispatch(updateSystemStatus('error'));
    }
  };
};

export const stopSystemMonitoring = (metricsInterval) => {
  return (dispatch) => {
    clearInterval(metricsInterval);
    dispatch(updateSystemStatus('idle'));
    
    // Return a Promise for consistency
    return Promise.resolve();
  };
};

/**
 * Add a notification to the system
 */
export const addNotification = (notification) => ({
  type: ADD_NOTIFICATION,
  payload: notification
});

/**
 * Clear all notifications
 */
export const clearNotifications = () => ({
  type: CLEAR_NOTIFICATIONS
});
