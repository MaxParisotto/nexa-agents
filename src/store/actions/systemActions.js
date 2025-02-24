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
  return async (dispatch) => {
    try {
      dispatch(updateSystemStatus('running'));
      
      // Start periodic metrics collection
      const metricsInterval = setInterval(() => {
        const metrics = {
          cpuUsage: Math.random() * 100, // Replace with actual metrics
          memoryUsage: Math.random() * 100,
          activeAgents: Math.floor(Math.random() * 10),
          pendingTasks: Math.floor(Math.random() * 20)
        };
        dispatch(updateMetrics(metrics));
      }, 5000);

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
