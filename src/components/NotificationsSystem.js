import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Snackbar, Alert, Stack } from '@mui/material';
import { clearNotifications } from '../store/actions/systemActions';

/**
 * NotificationsSystem - Displays system notifications as toast messages
 * Retrieves notifications from Redux store and displays them as MUI Alerts
 */
const NotificationsSystem = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(state => state.system.notifications || []);
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  
  // Process new notifications
  useEffect(() => {
    if (notifications.length > 0) {
      // Get new notifications that aren't already being displayed
      const currentIds = visibleNotifications.map(n => n.id);
      const newNotifications = notifications.filter(n => !currentIds.includes(n.id));
      
      if (newNotifications.length > 0) {
        // Add new notifications to the visible list
        setVisibleNotifications(prev => [
          ...prev,
          ...newNotifications.map(n => ({
            ...n,
            open: true,
            autoHideDuration: getAutoDuration(n.type)
          }))
        ]);
      }
    }
  }, [notifications]);
  
  /**
   * Get the appropriate duration for a notification based on its type
   */
  const getAutoDuration = (type) => {
    switch (type) {
      case 'error':
        return 8000; // Errors stay longer
      case 'warning':
        return 6000;
      case 'info':
        return 4000;
      case 'success':
        return 3000;
      default:
        return 5000;
    }
  };
  
  /**
   * Handle closing a notification
   */
  const handleClose = (id) => {
    setVisibleNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, open: false } : n)
    );
    
    // Remove from state after animation completes
    setTimeout(() => {
      setVisibleNotifications(prev => prev.filter(n => n.id !== id));
    }, 500);
  };
  
  /**
   * Clear all notifications
   */
  const handleClearAll = () => {
    setVisibleNotifications(prev => 
      prev.map(n => ({ ...n, open: false }))
    );
    
    // Remove all after animation completes
    setTimeout(() => {
      setVisibleNotifications([]);
      dispatch(clearNotifications());
    }, 500);
  };
  
  return (
    <Stack spacing={2} sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 2000 }}>
      {visibleNotifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={notification.open}
          autoHideDuration={notification.autoHideDuration}
          onClose={() => handleClose(notification.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ position: 'relative', bottom: 'auto', right: 'auto' }}
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.type || 'info'}
            variant="filled"
            sx={{ 
              minWidth: '250px',
              boxShadow: 3
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
};

export default NotificationsSystem; 