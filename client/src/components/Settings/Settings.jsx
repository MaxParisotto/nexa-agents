import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, CircularProgress, Alert, Button 
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useThemeContext } from '../../contexts/ThemeContext';
import SettingsTabs from './SettingsTabs';

/**
 * Settings Page Component - App configuration settings
 */
export default function Settings() {
  const { darkMode, toggleDarkMode } = useThemeContext();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        // In a real app, this would fetch from your API
        // For now, we'll simulate a response with mock data
        
        // Simulate API call
        const mockResponse = {
          theme: {
            darkMode: darkMode,
            accentColor: '#4a76a8'
          },
          api: {
            lmStudio: {
              apiUrl: 'http://localhost:1234',
              apiKey: '',
              defaultModel: 'llama2'
            },
            ollama: {
              apiUrl: 'http://localhost:11434',
              defaultModel: 'llama2'
            },
            agora: {
              apiKey: '',
              defaultProvider: 'openai',
              defaultModel: 'gpt-4',
              enabled: false
            }
          },
          notifications: {
            enabled: true,
            sound: true,
            desktopNotifications: false
          },
          system: {
            autoSave: true,
            loggingLevel: 'info',
            metricsEnabled: true,
            threadCount: 4,
            useGpu: false,
            devMode: false,
            experimentalFeatures: false
          },
          integrations: {
            github: { enabled: false, token: '' },
            slack: { enabled: false, webhookUrl: '' },
            customGpt: { enabled: false },
            cloud: { enabled: false, apiKey: '', bucketName: '' }
          },
          version: '1.0.0',
        };

        // Wait for "API call"
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setSettings(mockResponse);
        setError(null);
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [darkMode]);
  
  // Save settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      // In a real app, this would be an API call to save the settings
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update dark mode setting in parent component
      if (settings.theme.darkMode !== darkMode) {
        toggleDarkMode();
      }
      
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000); // Clear success message after 3 seconds
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Reset settings to defaults
  const handleResetSettings = async () => {
    // This would typically fetch default settings from the API
    // For now, just simulate
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock default settings
      const defaultSettings = {
        theme: {
          darkMode: false,
          accentColor: '#4a76a8'
        },
        api: {
          lmStudio: {
            apiUrl: 'http://localhost:1234',
            apiKey: '',
            defaultModel: 'llama2'
          },
          ollama: {
            apiUrl: 'http://localhost:11434',
            defaultModel: 'llama2'
          },
          agora: {
            apiKey: '',
            defaultProvider: 'openai',
            defaultModel: 'gpt-4',
            enabled: false
          }
        },
        notifications: {
          enabled: true,
          sound: true,
          desktopNotifications: false
        },
        system: {
          autoSave: true,
          loggingLevel: 'info',
          metricsEnabled: true,
          threadCount: 4
        },
        integrations: {
          github: { enabled: false, token: '' },
          slack: { enabled: false, webhookUrl: '' },
          customGpt: { enabled: false },
          cloud: { enabled: false, apiKey: '', bucketName: '' }
        },
        version: '1.0.0',
      };
      
      setSettings(defaultSettings);
      
      // Update dark mode in parent component if needed
      if (darkMode !== defaultSettings.theme.darkMode) {
        toggleDarkMode();
      }
      
      setSuccess('Settings reset to defaults');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error resetting settings:', err);
      setError('Failed to reset settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle settings change
  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };
  
  if (loading && !settings) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!settings) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        Unable to load settings. Please refresh the page.
      </Alert>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <SettingsTabs 
          settings={settings}
          onSettingChange={handleSettingChange}
          darkMode={darkMode}
        />
      </Paper>
      
      {/* Action buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button 
          variant="outlined" 
          startIcon={<RestartAltIcon />}
          onClick={handleResetSettings}
          disabled={loading || saving}
        >
          Reset to Defaults
        </Button>
        
        <Button 
          variant="contained" 
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
          disabled={loading || saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
}