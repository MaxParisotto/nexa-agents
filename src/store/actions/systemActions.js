export const startSystemMonitoring = () => ({
  type: 'START_SYSTEM_MONITORING'
});

export const addNotification = (notification) => ({
  type: 'ADD_NOTIFICATION',
  payload: notification
});
