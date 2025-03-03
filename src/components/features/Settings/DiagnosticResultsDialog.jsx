import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Box,
  Divider,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

/**
 * Component to display diagnostic test results in a modal dialog
 */
const DiagnosticResultsDialog = ({ open, onClose, results, running }) => {
  // Handle case where results aren't available yet
  if (!results && !running) {
    return null;
  }
  
  // Format timestamp to be more readable
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Not available';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  // Get icon and color based on status
  const getStatusIconAndColor = (status) => {
    switch (status) {
      case 'success':
        return { icon: <CheckCircleIcon />, color: 'success' };
      case 'warning':
        return { icon: <WarningIcon />, color: 'warning' };
      case 'error':
        return { icon: <ErrorIcon />, color: 'error' };
      case 'running':
        return { icon: <CircularProgress size={16} />, color: 'info' };
      default:
        return { icon: <WarningIcon />, color: 'default' };
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 3
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        {running ? 'Running Diagnostic Test...' : 'LLM Diagnostic Results'}
      </DialogTitle>
      
      <DialogContent dividers>
        {running ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">Running diagnostic tests...</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This may take a few moments. Testing connection, API endpoints, and model availability.
            </Typography>
          </Box>
        ) : results ? (
          <>
            {/* Summary Section */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1">
                  Server: {results.apiUrl}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatTimestamp(results.timestamp)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body1" sx={{ mr: 1 }}>
                  Model: {results.model}
                </Typography>
                {results.modelAvailable ? (
                  <Chip 
                    size="small" 
                    label="Available" 
                    color="success" 
                    variant="outlined" 
                  />
                ) : (
                  <Chip 
                    size="small" 
                    label="Not Found" 
                    color="warning" 
                    variant="outlined" 
                  />
                )}
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body1" sx={{ mr: 1 }}>
                  Overall Status:
                </Typography>
                <Chip 
                  label={results.generalStatus === 'success' ? 'All Tests Passed' : 
                         results.generalStatus === 'warning' ? 'Partial Success' : 'Tests Failed'} 
                  color={results.generalStatus === 'success' ? 'success' : 
                         results.generalStatus === 'warning' ? 'warning' : 'error'}
                />
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Test Steps */}
            <Typography variant="h6" gutterBottom>
              Diagnostic Steps
            </Typography>
            
            <Stepper orientation="vertical" sx={{ mb: 3 }}>
              {results.steps.map((step, index) => {
                const { icon, color } = getStatusIconAndColor(step.status);
                
                return (
                  <Step key={`step-${index}`} active={true} completed={step.status !== 'running'}>
                    <StepLabel StepIconComponent={() => (
                      <Box sx={{ 
                        color: `${color}.main`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {icon}
                      </Box>
                    )}>
                      {step.name}
                    </StepLabel>
                    <StepContent>
                      <Typography variant="body2">{step.message}</Typography>
                      
                      {step.details && (
                        <Paper elevation={0} sx={{ p: 1, mt: 1, bgcolor: 'background.default' }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                            {step.details}
                          </Typography>
                        </Paper>
                      )}
                    </StepContent>
                  </Step>
                );
              })}
            </Stepper>
            
            {/* Error Details (if any) */}
            {results.errorDetails && (
              <Box sx={{ mt: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  An error occurred during diagnostics: {results.errorDetails.message}
                </Alert>
                
                <Typography variant="subtitle2" gutterBottom>
                  Error Details:
                </Typography>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 2,
                    bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                    maxHeight: '150px',
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    whiteSpace: 'pre-wrap',
                    borderRadius: 1
                  }}
                >
                  {results.errorDetails.stack || results.errorDetails.message}
                </Paper>
              </Box>
            )}
            
            {/* Troubleshooting Tips */}
            {results.generalStatus !== 'success' && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Troubleshooting Tips
                </Typography>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Here are some common solutions:
                  </Typography>
                  <ul>
                    <li>Ensure the server is running and accessible at {results.apiUrl}</li>
                    <li>Check that the model "{results.model}" is loaded in your LLM server</li>
                    <li>Verify network connectivity and firewall settings</li>
                    <li>Restart the LLM server if it's unresponsive</li>
                  </ul>
                </Alert>
              </Box>
            )}
          </>
        ) : (
          <Typography variant="body1" color="text.secondary">
            No diagnostic results available.
          </Typography>
        )}
      </DialogContent>
      
      <DialogActions>
        {!running && (
          <Button onClick={onClose} autoFocus>
            Close
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DiagnosticResultsDialog;
