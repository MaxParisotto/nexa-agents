import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Button,
  CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, DialogContentText
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

import { useSettings } from '../../contexts/SettingsContext';
import GeneralSettings from './GeneralSettings';
import LlmProviderSettings from './LlmProviderSettings';
import UISettings from './UISettings';
import AdvancedSettings from './AdvancedSettings';

/**
 * Settings component for managing application settings
 */
export default function Settings() {
  const { settings, loading, error, saveSettings, resetSettings } = useSettings();
  
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Set local settings once global settings are loaded
  useEffect(() => {
    if (settings) {
      setLocalSettings({ ...settings });
    }
  }, [settings]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle settings update
  const handleUpdateSettings = (section, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [section]: value
    }));
  };

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await saveSettings(localSettings);
      setSaveSuccess(true);
      
      // Reset success message after a delay
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err) {
      setSaveError(`Failed to save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Reset settings
  const handleReset = async () => {
    setResetDialogOpen(false);
    setSaving(true);
    
    try {
      await resetSettings();
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(`Failed to reset settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // If settings are still loading
  if (loading || !localSettings) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Settings</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<RestartAltIcon />}
            onClick={() => setResetDialogOpen(true)}
          >
            Reset
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {saveError}
        </Alert>
      )}
      
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="General" />
          <Tab label="LLM Providers" />
          <Tab label="UI & Appearance" />
          <Tab label="Advanced" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      {activeTab === 0 && (
        <GeneralSettings 
          settings={localSettings} 
          onUpdateSettings={handleUpdateSettings}
        />
      )}
      
      {activeTab === 1 && (
        <LlmProviderSettings 
          settings={localSettings} 
          onUpdateSettings={handleUpdateSettings}
        />
      )}
      
      {activeTab === 2 && (
        <UISettings 
          settings={localSettings} 
          onUpdateSettings={handleUpdateSettings}
        />
      )}
      
      {activeTab === 3 && (
        <AdvancedSettings 
          settings={localSettings} 
          onUpdateSettings={handleUpdateSettings}
        />
      )}
      
      {/* Reset Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
      >
        <DialogTitle>Reset Settings</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will reset all settings to their default values. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReset} color="error" autoFocus>Reset</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}