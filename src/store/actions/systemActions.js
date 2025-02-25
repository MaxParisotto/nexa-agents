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
export const addError = (error) => ({
  type: ADD_ERROR,
  payload: {
    id: Date.now(),
    timestamp: new Date().toISOString(),
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
      
      return workflows;
    } catch (error) {
      console.error('Error listing workflows:', error);
      
      dispatch(addNotification({
        type: 'error',
        message: `Failed to list workflows: ${error.message}`
      }));
      
      return [];
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
      
      return workflow;
    } catch (error) {
      console.error('Error saving workflow:', error);
      
      dispatch(addNotification({
        type: 'error',
        message: `Failed to save workflow: ${error.message}`
      }));
      
      return null;
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
      
      return workflow;
    } catch (error) {
      console.error('Error running workflow:', error);
      
      dispatch(addNotification({
        type: 'error',
        message: `Failed to run workflow: ${error.message}`
      }));
      
      return null;
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
      
      return true;
    } catch (error) {
      console.error('Error deleting workflow:', error);
      
      dispatch(addNotification({
        type: 'error',
        message: `Failed to delete workflow: ${error.message}`
      }));
      
      return false;
    }
  };
};

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
      
      // Set initial metrics
      dispatch(updateMetrics({
        cpuUsage: mockCpuUsage,
        memoryUsage: mockMemoryUsage,
        activeAgents: mockActiveAgents,
        pendingTasks: mockPendingTasks
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
        
        dispatch(updateMetrics({
          cpuUsage: mockCpuUsage,
          memoryUsage: mockMemoryUsage,
          activeAgents,
          pendingTasks
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
