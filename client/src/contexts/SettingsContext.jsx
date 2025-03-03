import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiService } from '../services/api';
import { DEFAULT_SETTINGS } from '../shared/defaultSettings';

// Create context
const SettingsContext = createContext();

/**
 * Settings provider component for managing global application settings
 */
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize settings from API or localStorage
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await apiService.getSettings();
        
        if (response && response.data) {
          setSettings(response.data);
        } else {
          throw new Error('Invalid settings data');
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
        setError("Failed to load settings");
        
        // If settings are in localStorage, try to use those
        try {
          const localSettings = localStorage.getItem('nexa_settings');
          if (localSettings) {
            setSettings(JSON.parse(localSettings));
          } else {
            // If all else fails, use default settings
            setSettings(DEFAULT_SETTINGS);
          }
        } catch (localErr) {
          console.error("Error reading local settings:", localErr);
          setSettings(DEFAULT_SETTINGS);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Save settings
  const saveSettings = async (newSettings) => {
    try {
      setLoading(true);
      await apiService.updateSettings(newSettings);
      
      // Update local state
      setSettings(newSettings);
      
      // Also save to localStorage as backup
      localStorage.setItem('nexa_settings', JSON.stringify(newSettings));
      
      return true;
    } catch (err) {
      console.error("Error saving settings:", err);
      setError("Failed to save settings");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update part of settings
  const updateSection = async (section, value) => {
    if (!settings) return false;
    
    const newSettings = {
      ...settings,
      [section]: value
    };
    
    return saveSettings(newSettings);
  };

  // Reset settings to defaults
  const resetSettings = async () => {
    return saveSettings(DEFAULT_SETTINGS);
  };

  // Value passed to provider
  const context = {
    settings,
    loading,
    error,
    saveSettings,
    updateSection,
    resetSettings
  };

  return (
    <SettingsContext.Provider value={context}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook to use settings context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
