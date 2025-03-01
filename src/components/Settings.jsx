import React, { useState } from 'react';
import {
  Container, Typography, Paper, Grid, Box, Tab, Tabs,
  Card, CardContent, TextField, Button, Switch, FormControlLabel
} from '@mui/material';
import SettingsTerminal from './Settings/SettingsTerminal';
import { useSelector, useDispatch } from 'react-redux';
import { updatePreference } from '../store/actions/systemActions';
import OpenAISettings from './Settings/OpenAISettings.jsx';

const Settings = () => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState(0);
  const systemPrefs = useSelector(state => state.system.preferences || {});
  const settings = useSelector(state => state.settings);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleToggleChange = (key) => (event) => {
    dispatch(updatePreference(key, event.target.checked));
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      
      <Paper sx={{ p: 1, mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="settings tabs">
          <Tab label="General" />
          <Tab label="LLM Providers" />
          <Tab label="OpenAI" />
          <Tab label="Advanced" />
          <Tab label="Terminal" />
        </Tabs>
      </Paper>
      
      {/* General Settings Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Application Settings</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel 
                      control={
                        <Switch 
                          checked={systemPrefs.darkMode || false}
                          onChange={handleToggleChange('darkMode')}
                        />
                      }
                      label="Dark Mode"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel 
                      control={
                        <Switch 
                          checked={systemPrefs.autoSave || true}
                          onChange={handleToggleChange('autoSave')}
                        />
                      }
                      label="Auto-save workflows"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel 
                      control={
                        <Switch 
                          checked={systemPrefs.showTips || true}
                          onChange={handleToggleChange('showTips')}
                        />
                      }
                      label="Show tooltips"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel 
                      control={
                        <Switch 
                          checked={systemPrefs.analytics || false}
                          onChange={handleToggleChange('analytics')}
                        />
                      }
                      label="Send anonymous usage data"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Workspace</Typography>
                <TextField
                  fullWidth
                  label="Workspace Path"
                  margin="normal"
                  value={settings.workspacePath || '/path/to/workspace'}
                  disabled
                  sx={{ mb: 2 }}
                />
                <Button variant="outlined">Change Workspace</Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Notifications</Typography>
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={systemPrefs.enableNotifications || true}
                      onChange={handleToggleChange('enableNotifications')}
                    />
                  }
                  label="Enable notifications"
                />
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={systemPrefs.soundAlerts || false}
                      onChange={handleToggleChange('soundAlerts')}
                    />
                  }
                  label="Sound alerts"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* LLM Providers Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Ollama</Typography>
                <TextField
                  fullWidth
                  label="API URL"
                  margin="normal"
                  defaultValue="http://localhost:11434"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Default Model"
                  margin="normal"
                  defaultValue="llama2"
                  sx={{ mb: 2 }}
                />
                <Button variant="contained" color="primary" sx={{ mr: 1 }}>
                  Save
                </Button>
                <Button variant="outlined">
                  Test Connection
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>LM Studio</Typography>
                <TextField
                  fullWidth
                  label="API URL"
                  margin="normal"
                  defaultValue="http://localhost:1234"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Default Model"
                  margin="normal"
                  defaultValue="mistral-7b-instruct-v0.1.Q4_K_M"
                  sx={{ mb: 2 }}
                />
                <Button variant="contained" color="primary" sx={{ mr: 1 }}>
                  Save
                </Button>
                <Button variant="outlined">
                  Test Connection
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* OpenAI Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <OpenAISettings />
          </Grid>
        </Grid>
      )}
      
      {/* Advanced Tab */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Backend Settings</Typography>
                <TextField
                  fullWidth
                  label="Server URL"
                  margin="normal"
                  defaultValue="http://localhost:3001"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="API Port"
                  type="number"
                  margin="normal"
                  defaultValue="3001"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="WebSocket Port"
                  type="number"
                  margin="normal"
                  defaultValue="8081"
                  sx={{ mb: 2 }}
                />
                <Button variant="contained" color="primary">
                  Save
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Performance</Typography>
                <FormControlLabel 
                  control={
                    <Switch 
                      defaultChecked
                    />
                  }
                  label="Hardware acceleration"
                />
                <FormControlLabel 
                  control={
                    <Switch 
                      defaultChecked
                    />
                  }
                  label="Parallel processing"
                />
                <Box sx={{ mt: 2 }}>
                  <Typography gutterBottom>Memory Limit (MB)</Typography>
                  <TextField
                    fullWidth
                    type="number"
                    defaultValue="2048"
                    sx={{ mb: 2 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Danger Zone</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button variant="outlined" color="error">
                    Reset All Settings
                  </Button>
                  <Button variant="outlined" color="error">
                    Clear Caches
                  </Button>
                  <Button variant="outlined" color="error">
                    Purge Workflow History
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* Terminal Tab */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>Debug Terminal</Typography>
                <SettingsTerminal />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default Settings;
