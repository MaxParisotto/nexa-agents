// System Status Actions
export const updateSystemStatus = (status) => ({
  type: 'UPDATE_SYSTEM_STATUS',
  payload: status
});

// WebSocket Status Actions
export const updateWebsocketStatus = (status) => ({
  type: 'UPDATE_WEBSOCKET_STATUS',
  payload: status
});

// Metrics Actions
export const updateMetrics = (metrics) => ({
  type: 'UPDATE_METRICS',
  payload: metrics
});

// Notification Actions
export const addNotification = (notification) => ({
  type: 'ADD_NOTIFICATION',
  payload: {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...notification
  }
});

export const clearNotifications = () => ({
  type: 'CLEAR_NOTIFICATIONS'
});

// Error Actions
export const addError = (error) => ({
  type: 'ADD_ERROR',
  payload: {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...error
  }
});

export const clearErrors = () => ({
  type: 'CLEAR_ERRORS'
});

// Workflow Actions
export const saveWorkflow = (workflow) => ({
  type: 'SAVE_WORKFLOW',
  payload: workflow
});

export const loadWorkflow = (workflowId) => ({
  type: 'LOAD_WORKFLOW',
  payload: workflowId
});

export const listWorkflows = () => ({
  type: 'LIST_WORKFLOWS'
});

export const deleteWorkflow = (workflowId) => ({
  type: 'DELETE_WORKFLOW',
  payload: workflowId
});

export const runWorkflow = (workflow) => ({
  type: 'RUN_WORKFLOW',
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

// Thunk action creators for workflows
export const saveWorkflowThunk = (workflow) => {
  return async (dispatch) => {
    try {
      // Save workflow to localStorage
      const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
      
      // Update existing or add new
      const existingIndex = workflows.findIndex(w => w.id === workflow.id);
      if (existingIndex >= 0) {
        workflows[existingIndex] = workflow;
      } else {
        // Generate a unique ID if not present
        if (!workflow.id) {
          workflow.id = `workflow-${Date.now()}`;
        }
        workflows.push(workflow);
      }
      
      localStorage.setItem('workflows', JSON.stringify(workflows));
      dispatch(saveWorkflow(workflow));
      
      dispatch(addNotification({
        type: 'success',
        message: `Workflow "${workflow.name}" saved successfully.`
      }));
      
      return workflow;
    } catch (error) {
      dispatch(addError({
        type: 'workflow',
        message: 'Failed to save workflow',
        error: error.message
      }));
      throw error;
    }
  };
};

export const loadWorkflowThunk = (workflowId) => {
  return async (dispatch) => {
    try {
      const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
      const workflow = workflows.find(w => w.id === workflowId);
      
      if (!workflow) {
        throw new Error(`Workflow with ID ${workflowId} not found`);
      }
      
      dispatch(loadWorkflow(workflow));
      
      dispatch(addNotification({
        type: 'info',
        message: `Workflow "${workflow.name}" loaded.`
      }));
      
      return workflow;
    } catch (error) {
      dispatch(addError({
        type: 'workflow',
        message: 'Failed to load workflow',
        error: error.message
      }));
      throw error;
    }
  };
};

export const listWorkflowsThunk = () => {
  return async (dispatch) => {
    try {
      const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
      return workflows;
    } catch (error) {
      dispatch(addError({
        type: 'workflow',
        message: 'Failed to list workflows',
        error: error.message
      }));
      return [];
    }
  };
};

export const deleteWorkflowThunk = (workflowId) => {
  return async (dispatch) => {
    try {
      const workflows = JSON.parse(localStorage.getItem('workflows') || '[]');
      const filteredWorkflows = workflows.filter(w => w.id !== workflowId);
      
      localStorage.setItem('workflows', JSON.stringify(filteredWorkflows));
      dispatch(deleteWorkflow(workflowId));
      
      dispatch(addNotification({
        type: 'success',
        message: `Workflow deleted successfully.`
      }));
      
      return true;
    } catch (error) {
      dispatch(addError({
        type: 'workflow',
        message: 'Failed to delete workflow',
        error: error.message
      }));
      return false;
    }
  };
};

export const runWorkflowThunk = (workflow) => {
  return async (dispatch) => {
    try {
      // Set workflow as running
      dispatch(updateWorkflowStatus(workflow.id, 'running'));
      
      dispatch(addNotification({
        type: 'info',
        message: `Workflow "${workflow.name}" execution started.`
      }));
      
      // Simulate workflow execution - this would be replaced with actual API calls
      // to execute the workflow steps based on node types and connections
      
      // For demo: Simulate a delay and mark workflow as completed
      setTimeout(() => {
        dispatch(updateWorkflowStatus(workflow.id, 'completed'));
        
        dispatch(addNotification({
          type: 'success',
          message: `Workflow "${workflow.name}" completed successfully.`
        }));
      }, 5000);
      
      return true;
    } catch (error) {
      dispatch(updateWorkflowStatus(workflow.id, 'error'));
      
      dispatch(addError({
        type: 'workflow',
        message: `Failed to execute workflow "${workflow.name}"`,
        error: error.message
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
