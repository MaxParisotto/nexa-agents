import React from 'react';
import { 
  Grid, FormControlLabel, Switch, TextField,
  FormControl, InputLabel, Select, MenuItem,
  Typography, Box, Divider, Card, CardContent,
  Alert, Button, Slider
} from '@mui/material';
import ComputerIcon from '@mui/icons-material/Computer';
import TerminalIcon from '@mui/icons-material/Terminal';

/**
 * System Settings Form Component
 * @param {Object} props - Component props
 * @param {Object} props.settings - Settings object
 * @param {Function} props.onSettingChange - Callback for setting changes
 */
export default function SystemSettingsForm({ settings, onSettingChange }) {
  // Handle switch toggle
  const handleSwitchChange = (event) => {
    onSettingChange('system', event.target.name, event.target.checked);
  };
  
  // Handle select change
  const handleSelectChange = (event) => {
    onSettingChange('system', event.target.name, event.target.value);
  };

  // Handle thread count change
  const handleThreadCountChange = (event, newValue) => {
    onSettingChange('system', 'threadCount', newValue);
  };
  
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>System Settings</Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Configure system behavior and performance settings
        </Typography>
      </Grid>
      
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ComputerIcon sx={{ mr: 1 }} color="primary" />
              <Typography variant="subtitle1" fontWeight="bold">Performance Settings</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.system.metricsEnabled !== false}
                      onChange={handleSwitchChange}
                      name="metricsEnabled"
                      color="primary"
                    />
                  }
                  label="Enable metrics collection"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.system.autoSave !== false}
                      onChange={handleSwitchChange}
                      name="autoSave"
                      color="primary"
                    />
                  }
                  label="Auto-save workflows"
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.system.useGpu === true}
                      onChange={handleSwitchChange}
                      name="useGpu"
                      color="primary"
                    />
                  }
                  label="Use GPU acceleration"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography gutterBottom>Max Worker Threads: {settings.system.threadCount || 4}</Typography>
                <Slider
                  value={settings.system.threadCount || 4}
                  onChange={handleThreadCountChange}
                  min={1}
                  max={16}
                  step={1}
                  marks={[
                    { value: 1, label: '1' },
                    { value: 4, label: '4' },
                    { value: 8, label: '8' },
                    { value: 16, label: '16' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="logging-level-label">Logging Level</InputLabel>
                  <Select
                    labelId="logging-level-label"
                    name="loggingLevel"
                    value={settings.system.loggingLevel || 'info'}
                    label="Logging Level"
                    onChange={handleSelectChange}
                  >
                    <MenuItem value="debug">Debug</MenuItem>
                    <MenuItem value="info">Info</MenuItem>
                    <MenuItem value="warn">Warning</MenuItem>
                    <MenuItem value="error">Error</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TerminalIcon sx={{ mr: 1 }} color="primary" />
              <Typography variant="subtitle1" fontWeight="bold">Developer Options</Typography>
            </Box>
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              These settings are intended for advanced users. Incorrect configuration may affect system stability.
            </Alert>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.system.devMode === true}
                      onChange={handleSwitchChange}
                      name="devMode"
                      color="primary"
                    />
                  }
                  label="Developer Mode"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.system.experimentalFeatures === true}
                      onChange={handleSwitchChange}
                      name="experimentalFeatures"
                      color="primary"
                    />
                  }
                  label="Enable Experimental Features"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="API Host"
                  name="apiHost"
                  value={settings.system.apiHost || 'http://localhost:3001'}
                  onChange={(e) => onSettingChange('system', 'apiHost', e.target.value)}
                  helperText="Only change if you're using a custom server setup"
                  size="small"
                  margin="normal"
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" color="warning" size="small">
                Reset to Default Settings
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Divider />
        <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Notifications</Typography>
      </Grid>
      
      <Grid item xs={12} sm={6} md={4}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.notifications?.enabled !== false}
              onChange={(e) => onSettingChange('notifications', 'enabled', e.target.checked)}
              name="enabled"
              color="primary"
            />
          }
          label="Enable notifications"
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={4}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.notifications?.sound !== false}
              onChange={(e) => onSettingChange('notifications', 'sound', e.target.checked)}
              name="sound"
              color="primary"
              disabled={settings.notifications?.enabled === false}
            />
          }
          label="Enable notification sounds"
        />
      </Grid>
      
      <Grid item xs={12} sm={6} md={4}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.notifications?.desktopNotifications === true}
              onChange={(e) => onSettingChange('notifications', 'desktopNotifications', e.target.checked)}
              name="desktopNotifications"
              color="primary"
              disabled={settings.notifications?.enabled === false}
            />
          }
          label="Desktop Notifications"
        />
      </Grid>
    </Grid>
  );
}
