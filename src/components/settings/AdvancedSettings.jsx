import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, FormControlLabel, Switch,
  TextField, Button, Alert, Divider, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import BackupIcon from '@mui/icons-material/Backup';
import GetAppIcon from '@mui/icons-material/GetApp';
import CodeIcon from '@mui/icons-material/Code';
import CachedIcon from '@mui/icons-material/Cached';

/**
 * Advanced Settings Component
 */
export default function AdvancedSettings({ settings, onUpdateSettings }) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  // Handle advanced settings change
  const handleAdvancedChange = (field, value) => {
    const updatedAdvanced = {
      ...settings.advanced,
      [field]: value
    };
    
    onUpdateSettings('advanced', updatedAdvanced);
  };
  
  // Handle caching settings change
  const handleCachingChange = (field, value) => {
    const updatedCaching = {
      ...settings.system.caching,
      [field]: value
    };
    
    onUpdateSettings('system', {
      ...settings.system,
      caching: updatedCaching
    });
  };
  
  // Handle dangerous action confirmation
  const handleConfirmAction = (action) => {
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  };
  
  // Execute confirmed action
  const executeConfirmedAction = () => {
    setConfirmDialogOpen(false);
    
    // Placeholder for actual implementation
    console.log(`Executing action: ${confirmAction}`);
    
    // In a real app, different actions would be implemented here
    switch (confirmAction) {
      case 'clearCache':
        // Clear application cache
        alert('Cache cleared successfully');
        break;
      case 'resetData':
        // Reset all application data
        alert('Application data reset successfully');
        break;
      case 'exportData':
        // Export application data
        alert('Data exported successfully');
        break;
      case 'importData':
        // Import application data
        // This would typically trigger a file picker
        alert('Please select a file to import');
        break;
      default:
        // Unknown action
        console.warn(`Unknown action: ${confirmAction}`);
    }
    
    setConfirmAction(null);
  };

  // Get confirmation message for the current action
  const getConfirmationMessage = () => {
    switch (confirmAction) {
      case 'clearCache':
        return 'Are you sure you want to clear all application cache? This will remove all temporary files but keep your settings.';
      case 'resetData':
        return 'WARNING: This will reset ALL application data including settings, connections, and logs. This cannot be undone.';
      case 'exportData':
        return 'Export all application data? This will include your settings, connections, and logs but not your API keys.';
      case 'importData':
        return 'Import application data from a file? This will overwrite your current settings and connections.';
      default:
        return 'Are you sure you want to continue with this action?';
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Advanced Settings</Typography>
      
      <Alert severity="warning" sx={{ mb: 3 }}>
        These settings are for advanced users. Changes may affect system stability.
      </Alert>
      
      {/* Developer Options */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Developer Options</Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.advanced?.debugMode || false}
                  onChange={(e) => handleAdvancedChange('debugMode', e.target.checked)}
                />
              }
              label="Debug Mode"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Enable additional logging and developer tools
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.advanced?.experimentalFeatures || false}
                  onChange={(e) => handleAdvancedChange('experimentalFeatures', e.target.checked)}
                />
              }
              label="Experimental Features"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Enable experimental features that may not be stable
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.advanced?.customScripts || false}
                  onChange={(e) => handleAdvancedChange('customScripts', e.target.checked)}
                />
              }
              label="Allow Custom Scripts"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Enable execution of custom JavaScript in workflows
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Caching Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Caching</Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.system?.caching?.enabled || false}
                  onChange={(e) => handleCachingChange('enabled', e.target.checked)}
                />
              }
              label="Enable Caching"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Cache responses to improve performance
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Cache TTL (seconds)"
              type="number"
              value={settings.system?.caching?.ttl || 3600}
              onChange={(e) => handleCachingChange('ttl', parseInt(e.target.value, 10))}
              disabled={!settings.system?.caching?.enabled}
              inputProps={{ min: 60, max: 86400 }}
              helperText="Time to live for cached items (60-86400 seconds)"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Cache Size Limit (MB)"
              type="number"
              value={settings.system?.caching?.maxSize || 100}
              onChange={(e) => handleCachingChange('maxSize', parseInt(e.target.value, 10))}
              disabled={!settings.system?.caching?.enabled}
              inputProps={{ min: 10, max: 1000 }}
              helperText="Maximum cache size in MB (10-1000)"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Button
              variant="outlined"
              startIcon={<CachedIcon />}
              onClick={() => handleConfirmAction('clearCache')}
              disabled={!settings.system?.caching?.enabled}
            >
              Clear Cache
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Data Management */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Data Management</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 3 }}>
                These actions affect your application data. Export your data before making major changes.
              </Alert>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GetAppIcon />}
                onClick={() => handleConfirmAction('exportData')}
              >
                Export All Data
              </Button>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<BackupIcon />}
                onClick={() => handleConfirmAction('importData')}
              >
                Import Data
              </Button>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>
            
            <Grid item xs={12}>
              <Button
                fullWidth
                variant="outlined"
                color="error"
                startIcon={<DeleteForeverIcon />}
                onClick={() => handleConfirmAction('resetData')}
              >
                Reset All Application Data
              </Button>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                WARNING: This will delete all settings, connections, and stored data.
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      
      {/* Custom Connection Settings */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">API Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="info" sx={{ mb: 3 }}>
                These settings control how the application connects to external services.
              </Alert>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Backend URL"
                value={settings.system?.backendUrl || 'http://localhost:3001'}
                onChange={(e) => onUpdateSettings('system', {
                  ...settings.system,
                  backendUrl: e.target.value
                })}
                helperText="URL for the backend API server"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Analytics Sampling Rate"
                type="number"
                value={settings.system?.analyticsSampling || 0.1}
                onChange={(e) => onUpdateSettings('system', {
                  ...settings.system,
                  analyticsSampling: parseFloat(e.target.value)
                })}
                inputProps={{ min: 0, max: 1, step: 0.1 }}
                helperText="Rate of events to sample for analytics (0-1)"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>
          {confirmAction === 'resetData' ? 'Dangerous Action' : 'Confirm Action'}
        </DialogTitle>
        <DialogContent>
          {confirmAction === 'resetData' && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'error.main' }}>
              <WarningIcon color="error" sx={{ mr: 1 }} />
              <Typography variant="subtitle1" color="error.main">
                This action cannot be undone!
              </Typography>
            </Box>
          )}
          <DialogContentText>
            {getConfirmationMessage()}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={executeConfirmedAction} 
            color={confirmAction === 'resetData' ? 'error' : 'primary'}
            autoFocus
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
