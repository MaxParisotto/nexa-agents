import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Snackbar, Alert, Stack } from '@mui/material';
import { clearNotifications } from '../store/actions/systemActions';

/**
 * NotificationsSystem - Displays system notifications as toast messages
 * Retrieves notifications from Redux store and displays them as MUI Alerts
 * with a limit on the number of simultaneous notifications
 */
const NotificationsSystem = () => {
  const dispatch = useDispatch();
  const notifications = useSelector(state => state.system.notifications || []);
  const [visibleNotifications, setVisibleNotifications] = useState([]);
  
  // Maximum number of notifications to show at once
  const MAX_VISIBLE_NOTIFICATIONS = 4;
  // Maximum time (in ms) any notification can stay on screen
  const ABSOLUTE_MAX_DURATION = 10000;
  
  // Process new notifications
  useEffect(() => {
    if (notifications.length > 0) {
      // Get new notifications that aren't already being displayed
      const currentIds = visibleNotifications.map(n => n.id);
      const newNotifications = notifications.filter(n => !currentIds.includes(n.id));
      
      if (newNotifications.length > 0) {
        // Add new notifications to the visible list, but respect the maximum limit
        setVisibleNotifications(prev => {
          // Process the new notifications
          const updatedNotifications = [
            ...prev,
            ...newNotifications.map(n => ({
              ...n,
              open: true,
              addedAt: Date.now(),
              autoHideDuration: Math.min(getAutoDuration(n.type), ABSOLUTE_MAX_DURATION)
            }))
          ];
          
          // If we have too many, close the oldest ones first (keeping MAX_VISIBLE_NOTIFICATIONS newest)
          if (updatedNotifications.length > MAX_VISIBLE_NOTIFICATIONS) {
            // Mark old notifications as closed but keep them in the array for animation
            return updatedNotifications.map((n, index) => {
              if (index < updatedNotifications.length - MAX_VISIBLE_NOTIFICATIONS) {
                return { ...n, open: false };
              }
              return n;
            });
          }
          
          return updatedNotifications;
        });
        
        // Clear the original notifications from Redux store to prevent reprocessing
        if (newNotifications.length > 0) {
          setTimeout(() => {
            dispatch(clearNotifications());
          }, 500);
        }
      }
    }
  }, [notifications, dispatch]);
  
  // Clean up closed notifications after animation completes
  useEffect(() => {
    // Remove closed notifications from state after animation completes
    const cleanupTimer = setTimeout(() => {
      setVisibleNotifications(prev => prev.filter(n => n.open));
    }, 600);
    
    // Clean up auto-expired notifications
    const now = Date.now();
    visibleNotifications.forEach(notification => {
      const expirationTime = notification.addedAt + notification.autoHideDuration;
      if (now > expirationTime && notification.open) {
        handleClose(notification.id);
      }
    });
    
    return () => clearTimeout(cleanupTimer);
  }, [visibleNotifications]);
  
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
  };
  
  /**
   * Clear all notifications
   */
  const handleClearAll = () => {
    setVisibleNotifications(prev => 
      prev.map(n => ({ ...n, open: false }))
    );
    
    dispatch(clearNotifications());
  };
  
  return (
    <Stack spacing={2} sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 2000 }}>
      {visibleNotifications
        .filter(notification => notification.open)
        .slice(-MAX_VISIBLE_NOTIFICATIONS)
        .map((notification) => (
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