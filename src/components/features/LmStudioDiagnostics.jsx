import React, { useState } from 'react';
import { 
  Box, Button, TextField, Typography, Paper, 
  CircularProgress, Accordion, AccordionSummary, 
  AccordionDetails, Alert, List, ListItem, ListItemText,
  ListItemIcon, Chip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import LmStudioEndpointFinder from '../utils/LmStudioEndpointFinder';

/**
 * LM Studio Diagnostics component for troubleshooting API connectivity
 */
const LmStudioDiagnostics = () => {
  const [apiUrl, setApiUrl] = useState('http://localhost:1234');
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);
  
  // Run diagnostics on LM Studio connection
  const runDiagnostics = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      // Basic connectivity check
      const diagResults = await LmStudioEndpointFinder.runDiagnostics(apiUrl);
      console.log('Diagnostic results:', diagResults);
      
      // Run endpoint finder for more detailed results
      const endpointResults = await LmStudioEndpointFinder.findWorkingEndpoint(apiUrl, true);
      console.log('Endpoint finder results:', endpointResults);
      
      setResults({
        diagnostics: diagResults,
        endpoints: endpointResults,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Diagnostics error:', error);
      setResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setTesting(false);
    }
  };

  // Handle URL input change
  const handleApiUrlChange = (e) => {
    setApiUrl(e.target.value);
  };

  // Render status icon based on check result
  const renderStatusIcon = (status) => {
    if (status === true) {
      return <CheckCircleIcon color="success" />;
    } else if (status === false) {
      return <ErrorIcon color="error" />;
    } else {
      return <WarningIcon color="warning" />;
    }
  };

  // Format timestamp in a readable format
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <Box sx={{ p: 2, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        LM Studio Connection Diagnostics
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Test LM Studio API Connectivity
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <TextField
            label="LM Studio API URL"
            value={apiUrl}
            onChange={handleApiUrlChange}
            fullWidth
            variant="outlined"
            size="small"
            placeholder="http://localhost:1234"
          />
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={runDiagnostics}
            disabled={testing}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {testing ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                Testing...
              </>
            ) : (
              'Run Diagnostics'
            )}
          </Button>
        </Box>
        
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          This tool helps you diagnose connectivity issues with LM Studio's API server. 
          It will test different API endpoints and provide detailed results about what's working.
        </Typography>
      </Paper>
      
      {results && !results.error && (
        <Box sx={{ mt: 3 }}>
          <Alert 
            severity={results.endpoints.success ? "success" : "warning"} 
            sx={{ mb: 3 }}
          >
            {results.endpoints.success 
              ? `Connection successful! Found working endpoint: ${results.endpoints.endpoint}` 
              : `Connection issues detected. ${results.endpoints.message}`}
          </Alert>
          
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Diagnostic Summary
            </Typography>
            
            <List dense>
              <ListItem>
                <ListItemIcon>
                  {renderStatusIcon(results.diagnostics.serverReachable)}
                </ListItemIcon>
                <ListItemText 
                  primary="Server Reachable" 
                  secondary={results.diagnostics.serverReachable ? "The server is responding to basic requests" : "The server is not responding"}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  {renderStatusIcon(results.diagnostics.modelsEndpoint)}
                </ListItemIcon>
                <ListItemText 
                  primary="Models Endpoint" 
                  secondary={results.diagnostics.modelsEndpoint 
                    ? `Found working models endpoint: ${results.diagnostics.modelsEndpoint}`
                    : "No working models endpoint found"}
                />
              </ListItem>
              
              <ListItem>
                <ListItemIcon>
                  {renderStatusIcon(results.diagnostics.chatEndpoint)}
                </ListItemIcon>
                <ListItemText 
                  primary="Chat Endpoint" 
                  secondary={results.diagnostics.chatEndpoint 
                    ? `Found working chat endpoint: ${results.diagnostics.chatEndpoint}`
                    : "No working chat endpoint found"}
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Available Models" 
                  secondary={
                    results.diagnostics.models?.length > 0 
                      ? results.diagnostics.models.join(', ')
                      : "No models detected"
                  }
                />
              </ListItem>
              
              <ListItem>
                <ListItemText 
                  primary="Test Completed" 
                  secondary={formatTimestamp(results.timestamp)}
                />
              </ListItem>
            </List>
          </Paper>
          
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Detailed Test Results</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="subtitle2" gutterBottom>
                Endpoint Test Results
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 2, mb: 2, maxHeight: 300, overflow: 'auto' }}>
                <pre style={{ margin: 0 }}>
                  {JSON.stringify(results.endpoints.results || results.endpoints, null, 2)}
                </pre>
              </Paper>
              
              <Typography variant="subtitle2" gutterBottom>
                Raw Diagnostic Data
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                <pre style={{ margin: 0 }}>
                  {JSON.stringify(results.diagnostics.rawResponses || results.diagnostics, null, 2)}
                </pre>
              </Paper>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
      
      {results && results.error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <Typography variant="subtitle1">Diagnostic Error</Typography>
          <Typography variant="body2">{results.error}</Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            {formatTimestamp(results.timestamp)}
          </Typography>
        </Alert>
      )}
      
      {!results && !testing && (
        <Alert severity="info" sx={{ mt: 3 }}>
          Click "Run Diagnostics" to test your LM Studio API connection.
        </Alert>
      )}
      
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Troubleshooting Tips
        </Typography>
        
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Make sure LM Studio is running" 
              secondary="Launch LM Studio and ensure it's fully loaded with a model"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Enable the API server" 
              secondary="In LM Studio, enable the OpenAI-compatible server in settings"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Verify the port number" 
              secondary="Default is 1234, but may be different in your configuration"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Load a model" 
              secondary="Make sure you have a model loaded in LM Studio's interface"
            />
          </ListItem>
        </List>
      </Box>
    </Box>
  );
};

export default LmStudioDiagnostics;