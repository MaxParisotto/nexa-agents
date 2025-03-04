import React from 'react';
import {
  Box, Typography, Paper, Grid, FormControlLabel, Switch, TextField,
  Select, MenuItem, FormControl, InputLabel, Alert, Divider
} from '@mui/material';

/**
 * General Settings Component
 */
export default function GeneralSettings({ settings, onUpdateSettings }) {
  // Handle notifications settings change
  const handleNotificationsChange = (field, value) => {
    const updatedNotifications = {
      ...settings.notifications,
      [field]: value
    };
    
    onUpdateSettings('notifications', updatedNotifications);
  };

  // Handle nested notifications settings
  const handleNestedNotificationsChange = (parent, field, value) => {
    const updatedNotifications = {
      ...settings.notifications,
      [parent]: {
        ...settings.notifications[parent],
        [field]: value
      }
    };
    
    onUpdateSettings('notifications', updatedNotifications);
  };

  // Handle email notification types change
  const handleEmailTypesChange = (type, checked) => {
    let updatedTypes = [...settings.notifications.email.types];
    
    if (checked && !updatedTypes.includes(type)) {
      updatedTypes.push(type);
    } else if (!checked && updatedTypes.includes(type)) {
      updatedTypes = updatedTypes.filter(t => t !== type);
    }
    
    handleNestedNotificationsChange('email', 'types', updatedTypes);
  };

  // System settings change
  const handleSystemChange = (field, value) => {
    const updatedSystem = {
      ...settings.system,
      [field]: value
    };
    
    onUpdateSettings('system', updatedSystem);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>General Settings</Typography>
      
      {/* Notifications Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Notifications</Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications?.enabled || false}
                  onChange={(e) => handleNotificationsChange('enabled', e.target.checked)}
                />
              }
              label="Enable Notifications"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications?.sound || false}
                  onChange={(e) => handleNotificationsChange('sound', e.target.checked)}
                  disabled={!settings.notifications?.enabled}
                />
              }
              label="Sound Notifications"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications?.desktop || false}
                  onChange={(e) => handleNotificationsChange('desktop', e.target.checked)}
                  disabled={!settings.notifications?.enabled}
                />
              }
              label="Desktop Notifications"
            />
          </Grid>
          
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>Email Notifications</Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications?.email?.enabled || false}
                  onChange={(e) => handleNestedNotificationsChange('email', 'enabled', e.target.checked)}
                  disabled={!settings.notifications?.enabled}
                />
              }
              label="Enable Email Notifications"
            />
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl 
                  fullWidth
                  disabled={!settings.notifications?.enabled || !settings.notifications?.email?.enabled}
                >
                  <InputLabel>Email Frequency</InputLabel>
                  <Select
                    value={settings.notifications?.email?.frequency || 'daily'}
                    onChange={(e) => handleNestedNotificationsChange('email', 'frequency', e.target.value)}
                    label="Email Frequency"
                  >
                    <MenuItem value="realtime">Real-time</MenuItem>
                    <MenuItem value="hourly">Hourly Digest</MenuItem>
                    <MenuItem value="daily">Daily Digest</MenuItem>
                    <MenuItem value="weekly">Weekly Digest</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  Notification Types
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.notifications?.email?.types?.includes('important') || false}
                          onChange={(e) => handleEmailTypesChange('important', e.target.checked)}
                          disabled={!settings.notifications?.enabled || !settings.notifications?.email?.enabled}
                        />
                      }
                      label="Important Alerts"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.notifications?.email?.types?.includes('mentions') || false}
                          onChange={(e) => handleEmailTypesChange('mentions', e.target.checked)}
                          disabled={!settings.notifications?.enabled || !settings.notifications?.email?.enabled}
                        />
                      }
                      label="Mentions"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.notifications?.email?.types?.includes('updates') || false}
                          onChange={(e) => handleEmailTypesChange('updates', e.target.checked)}
                          disabled={!settings.notifications?.enabled || !settings.notifications?.email?.enabled}
                        />
                      }
                      label="System Updates"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
      
      {/* System Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>System</Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Logging Level</InputLabel>
              <Select
                value={settings.system?.loggingLevel || 'info'}
                onChange={(e) => handleSystemChange('loggingLevel', e.target.value)}
                label="Logging Level"
              >
                <MenuItem value="debug">Debug</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
              <Typography variant="caption" color="text.secondary">
                Controls the verbosity of application logs
              </Typography>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Maximum Concurrency"
              type="number"
              value={settings.system?.concurrency || 3}
              onChange={(e) => handleSystemChange('concurrency', parseInt(e.target.value, 10))}
              inputProps={{ min: 1, max: 10 }}
              helperText="Maximum number of concurrent operations"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.system?.metrics || false}
                  onChange={(e) => handleSystemChange('metrics', e.target.checked)}
                />
              }
              label="Enable Metrics Collection"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Collect usage metrics to optimize performance
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.system?.autoUpdate || false}
                  onChange={(e) => handleSystemChange('autoUpdate', e.target.checked)}
                />
              }
              label="Enable Auto Updates"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Automatically check for and apply updates
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Privacy Settings */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Privacy</Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          Control how your data is used and shared. All data is processed locally by default.
        </Alert>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.privacy?.allowErrorReporting || false}
                  onChange={(e) => onUpdateSettings('privacy', {
                    ...settings.privacy,
                    allowErrorReporting: e.target.checked
                  })}
                />
              }
              label="Allow Error Reporting"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Send anonymous error reports to help improve stability
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.privacy?.allowUsageStatistics || false}
                  onChange={(e) => onUpdateSettings('privacy', {
                    ...settings.privacy,
                    allowUsageStatistics: e.target.checked
                  })}
                />
              }
              label="Allow Usage Statistics"
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Share anonymous usage data to improve features
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
