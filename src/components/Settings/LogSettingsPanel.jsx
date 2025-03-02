import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Button,
  Divider,
  TextField,
  Grid,
  Alert
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { updateLogSettings, clearLogs } from '../../store/actions/logActions';

/**
 * Log Settings Panel component for configuring application logging
 */
const LogSettingsPanel = () => {
  const dispatch = useDispatch();
  const logSettings = useSelector(state => state.logs.settings || {});
  
  const [settings, setSettings] = useState({
    logLevel: logSettings.logLevel || 'info',
    maxLogEntries: logSettings.maxLogEntries || 1000,
    showTimestamp: logSettings.showTimestamp ?? true,
    enableConsoleLogging: logSettings.enableConsoleLogging ?? true,
    enableFileLogging: logSettings.enableFileLogging ?? false,
    logFilePath: logSettings.logFilePath || './logs',
    autoClearThreshold: logSettings.autoClearThreshold || 5000
  });
  
  const [saved, setSaved] = useState(false);

  const handleChange = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings({ ...settings, [name]: value });
    setSaved(false);
  };

  const handleSave = () => {
    dispatch(updateLogSettings(settings));
    setSaved(true);
    
    // Reset saved status after 3 seconds
    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      dispatch(clearLogs());
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Log Settings
        </Typography>
        
        {saved && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Log settings saved successfully
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Log Level</InputLabel>
              <Select
                value={settings.logLevel}
                onChange={handleChange('logLevel')}
                label="Log Level"
              >
                <MenuItem value="debug">Debug</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Maximum Log Entries"
              type="number"
              fullWidth
              margin="normal"
              value={settings.maxLogEntries}
              onChange={handleChange('maxLogEntries')}
              inputProps={{ min: 100, max: 10000 }}
            />
            
            <TextField
              label="Auto-clear Threshold (entries)"
              type="number"
              fullWidth
              margin="normal"
              value={settings.autoClearThreshold}
              onChange={handleChange('autoClearThreshold')}
              inputProps={{ min: 1000, max: 50000 }}
              helperText="Automatically clear logs when this number is reached"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showTimestamp}
                  onChange={handleChange('showTimestamp')}
                  color="primary"
                />
              }
              label="Show Timestamp"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableConsoleLogging}
                  onChange={handleChange('enableConsoleLogging')}
                  color="primary"
                />
              }
              label="Enable Console Logging"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableFileLogging}
                  onChange={handleChange('enableFileLogging')}
                  color="primary"
                />
              }
              label="Enable File Logging"
            />
            
            <TextField
              label="Log File Path"
              fullWidth
              margin="normal"
              value={settings.logFilePath}
              onChange={handleChange('logFilePath')}
              disabled={!settings.enableFileLogging}
              helperText="Directory where log files will be stored"
            />
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            color="error"
            onClick={handleClearLogs}
          >
            Clear All Logs
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default LogSettingsPanel;
