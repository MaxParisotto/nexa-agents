import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Chip, Button, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, Alert, CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { checkLmStudioConnection, checkOllamaConnection } from '../utils/ServerConnectionChecker';

/**
 * Component to display LLM server connection status with diagnostic information
 */
const ConnectionStatus = ({ showRefresh = true, variant = "full" }) => {
  const [lmStudioStatus, setLmStudioStatus] = useState({ status: 'unknown' });
  const [ollamaStatus, setOllamaStatus] = useState({ status: 'unknown' });
  const [isChecking, setIsChecking] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const settings = useSelector(state => state.settings);

  // Check connection status
  const checkConnections = async () => {
    setIsChecking(true);
    
    try {
      const lmStudioUrl = settings?.lmStudio?.apiUrl || 'http://localhost:1234';
      const ollamaUrl = settings?.ollama?.apiUrl || 'http://localhost:11434';
      
      const [lmStudioResult, ollamaResult] = await Promise.all([
        checkLmStudioConnection(lmStudioUrl),
        checkOllamaConnection(ollamaUrl)
      ]);
      
      setLmStudioStatus(lmStudioResult);
      setOllamaStatus(ollamaResult);
    } catch (error) {
      console.error('Error checking connections:', error);
    } finally {
      setIsChecking(false);
    }
  };
  
  // Check on component mount
  useEffect(() => {
    checkConnections();
    
    // Periodic check every 30 seconds
    const intervalId = setInterval(checkConnections, 30000);
    return () => clearInterval(intervalId);
  }, [settings?.lmStudio?.apiUrl, settings?.ollama?.apiUrl]);
  
  // Determine overall status
  const getOverallStatus = () => {
    if (lmStudioStatus.status === 'available' || ollamaStatus.status === 'available') {
      return 'available';
    }
    if (lmStudioStatus.status === 'endpoint_missing' || ollamaStatus.status === 'endpoint_missing') {
      return 'partial';
    }
    if (lmStudioStatus.status === 'error' || ollamaStatus.status === 'error') {
      return 'error';
    }
    if (lmStudioStatus.status === 'unavailable' && ollamaStatus.status === 'unavailable') {
      return 'unavailable';
    }
    return 'unknown';
  };
  
  // Get status chip props
  const getStatusChip = () => {
    const status = getOverallStatus();
    
    switch (status) {
      case 'available':
        return {
          label: 'LLM Connected',
          color: 'success',
          icon: <CheckCircleIcon fontSize="small" />
        };
      case 'partial':
        return {
          label: 'Partial Connection',
          color: 'warning',
          icon: <WarningIcon fontSize="small" />
        };
      case 'error':
      case 'unavailable':
        return {
          label: 'LLM Not Connected',
          color: 'error',
          icon: <ErrorIcon fontSize="small" />
        };
      default:
        return {
          label: 'Checking Status',
          color: 'default',
          icon: <CircularProgress size={14} />
        };
    }
  };
  
  // Render status indicator based on variant
  if (variant === 'chip') {
    const chipProps = getStatusChip();
    return (
      <Chip
        icon={chipProps.icon}
        label={chipProps.label}
        color={chipProps.color}
        size="small"
        onClick={() => setShowDiagnostics(true)}
      />
    );
  }
  
  // Full variant
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          icon={getStatusChip().icon}
          label={getStatusChip().label}
          color={getStatusChip().color}
          onClick={() => setShowDiagnostics(true)}
        />
        
        {showRefresh && (
          <Button 
            size="small" 
            startIcon={<RefreshIcon />} 
            onClick={checkConnections}
            disabled={isChecking}
          >
            {isChecking ? 'Checking...' : 'Check'}
          </Button>
        )}
      </Box>
      
      {/* Diagnostics dialog */}
      <Dialog open={showDiagnostics} onClose={() => setShowDiagnostics(false)} maxWidth="md">
        <DialogTitle>LLM Server Connection Diagnostics</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <Typography variant="h6">LM Studio Status</Typography>
            <Alert 
              severity={
                lmStudioStatus.status === 'available' ? 'success' : 
                lmStudioStatus.status === 'endpoint_missing' ? 'warning' : 'error'
              }
              sx={{ mb: 2 }}
            >
              {lmStudioStatus.message}
            </Alert>
            
            {lmStudioStatus.helpText && (
              <List dense>
                {lmStudioStatus.helpText.map((text, index) => (
                  <ListItem key={`lm-help-${index}`}>
                    <ListItemText primary={text} />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          
          <Box sx={{ my: 2 }}>
            <Typography variant="h6">Ollama Status</Typography>
            <Alert 
              severity={
                ollamaStatus.status === 'available' ? 'success' : 
                ollamaStatus.status === 'endpoint_missing' ? 'warning' : 'error'
              }
              sx={{ mb: 2 }}
            >
              {ollamaStatus.message}
            </Alert>
            
            {ollamaStatus.helpText && (
              <List dense>
                {ollamaStatus.helpText.map((text, index) => (
                  <ListItem key={`ollama-help-${index}`}>
                    <ListItemText primary={text} />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            To use the application effectively, at least one LLM server (LM Studio or Ollama) needs to be running. 
            Please follow the troubleshooting steps above if you're experiencing connection issues.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={checkConnections} disabled={isChecking}>
            {isChecking ? 'Checking...' : 'Refresh Status'}
          </Button>
          <Button onClick={() => setShowDiagnostics(false)} autoFocus>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConnectionStatus;
