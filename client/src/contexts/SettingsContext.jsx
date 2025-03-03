import React, { createContext, useContext, useState, useEffect } from 'react';
import settingsService from '../services/settingsService';
import { DEFAULT_SETTINGS } from '../shared/defaultSettings';

// Create context
const SettingsContext = createContext();

/**
 * Settings Provider Component
 */
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const loadedSettings = await settingsService.initialize();
        setSettings(loadedSettings);
        setError(null);
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError('Failed to load settings. Using defaults.');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
    
    // Set up listener for settings changes from other components
    const unsubscribe = settingsService.addListener((newSettings) => {
      setSettings(newSettings);
    });
    
    return () => unsubscribe();
  }, []);

  // Update settings
  const updateSettings = async (newSettings) => {
    try {
      const updated = await settingsService.updateSettings(newSettings);
      setSettings(updated);
      return true;
    } catch (err) {
      console.error('Failed to update settings:', err);
      return false;
    }
  };

  // Update just a section of settings
  const updateSection = async (section, values) => {
    try {
      const updated = await settingsService.updateSection(section, values);
      setSettings(updated);
      return true;
    } catch (err) {
      console.error(`Failed to update ${section} settings:`, err);
      return false;
    }
  };

  // Reset settings to defaults
  const resetSettings = async () => {
    try {
      const defaults = await settingsService.resetSettings();
      setSettings(defaults);
      return true;
    } catch (err) {
      console.error('Failed to reset settings:', err);
      return false;
    }
  };

  // Reset a specific section to defaults
  const resetSection = async (section) => {
    try {
      const updated = await settingsService.resetSection(section);
      setSettings(updated);
      return true;
    } catch (err) {
      console.error(`Failed to reset ${section} settings:`, err);
      return false;
    }
  };
  
  // Export settings to a file
  const exportSettings = async () => {
    try {
      await settingsService.exportSettings();
      return true;
    } catch (err) {
      console.error('Failed to export settings:', err);
      return false;
    }
  };
  
  // Import settings from a file
  const importSettings = async (file) => {
    try {
      const imported = await settingsService.importSettings(file);
      setSettings(imported);
      return true;
    } catch (err) {
      console.error('Failed to import settings:', err);
      return false;
    }
  };

  const value = {
    settings,
    loading,
    error,
    updateSettings,
    updateSection,
    resetSettings,
    resetSection,
    exportSettings,
    importSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use the settings context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
