import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  FormControlLabel,
  Switch,
  Button,
  Card,
  CardContent,
  Grid,
  Divider,
  Alert
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { updateGeneralSettings } from '../../store/actions/settingsActions';

/**
 * General Settings component for application-wide configuration
 */
const GeneralSettings = () => {
  const dispatch = useDispatch();
  const generalSettings = useSelector(state => state.settings.general || {});
  
  const [settings, setSettings] = useState({
    applicationName: generalSettings.applicationName || 'Nexa Agents',
    theme: generalSettings.theme || 'light',
    telemetryEnabled: generalSettings.telemetryEnabled ?? true,
    autoSave: generalSettings.autoSave ?? true,
    autoSaveInterval: generalSettings.autoSaveInterval || 5,
    maxHistoryItems: generalSettings.maxHistoryItems || 50
  });
  
  const [saved, setSaved] = useState(false);

  const handleChange = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setSettings({ ...settings, [name]: value });
    setSaved(false);
  };

  const handleSave = () => {
    dispatch(updateGeneralSettings(settings));
    setSaved(true);
    
    // Reset saved status after 3 seconds
    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          General Settings
        </Typography>
        
        {saved && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Settings saved successfully
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Application Name"
              fullWidth
              margin="normal"
              value={settings.applicationName}
              onChange={handleChange('applicationName')}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.theme === 'dark'}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      theme: e.target.checked ? 'dark' : 'light'
                    });
                    setSaved(false);
                  }}
                  color="primary"
                />
              }
              label="Dark Mode"
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.telemetryEnabled}
                  onChange={handleChange('telemetryEnabled')}
                  color="primary"
                />
              }
              label="Enable Anonymous Usage Data"
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoSave}
                  onChange={handleChange('autoSave')}
                  color="primary"
                />
              }
              label="Auto-save Projects"
            />
            
            <TextField
              label="Auto-save Interval (minutes)"
              type="number"
              fullWidth
              margin="normal"
              value={settings.autoSaveInterval}
              onChange={handleChange('autoSaveInterval')}
              disabled={!settings.autoSave}
              inputProps={{ min: 1, max: 60 }}
            />
            
            <TextField
              label="Maximum History Items"
              type="number"
              fullWidth
              margin="normal"
              value={settings.maxHistoryItems}
              onChange={handleChange('maxHistoryItems')}
              inputProps={{ min: 10, max: 1000 }}
            />
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
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

export default GeneralSettings;
