import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, Button } from '@mui/material';
import { CheckCircle, Error, Refresh } from '@mui/icons-material';

/**
 * ApiStatus component displays the connection status to the backend API
 */
const ApiStatus = () => {
  const [status, setStatus] = useState('checking');
  const [lastChecked, setLastChecked] = useState(null);

  const checkApiStatus = async () => {
    setStatus('checking');
    
    try {
      // Try to access the test endpoint
      const response = await fetch('http://localhost:3001/api/test/test', {
        // Add a timeout to avoid hanging requests
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        setStatus('connected');
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
    
    setLastChecked(new Date());
  };

  // Check API status on component mount
  useEffect(() => {
    checkApiStatus();
    
    // Set up periodic check every 30 seconds
    const interval = setInterval(checkApiStatus, 30000);
    
    // Clean up on unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mr: 1 }}>API Status:</Typography>
      
      {status === 'connected' && (
        <Chip 
          icon={<CheckCircle />} 
          label="Connected" 
          color="success" 
          size="small"
          sx={{ mr: 1 }}
        />
      )}
      
      {status === 'checking' && (
        <Chip 
          label="Checking..." 
          color="primary" 
          size="small"
          sx={{ mr: 1 }}
        />
      )}
      
      {status === 'error' && (
        <Chip 
          icon={<Error />} 
          label="Offline" 
          color="error" 
          size="small"
          sx={{ mr: 1 }}
        />
      )}
      
      <Button 
        size="small" 
        startIcon={<Refresh />} 
        onClick={checkApiStatus}
        sx={{ ml: 1 }}
      >
        Refresh
      </Button>
      
      {lastChecked && (
        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
          Last checked: {lastChecked.toLocaleTimeString()}
        </Typography>
      )}
    </Box>
  );
};

export default ApiStatus; 