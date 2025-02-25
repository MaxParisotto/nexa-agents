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
