import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

/**
 * Custom hook for managing application settings
 */
export function useSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  /**
   * Fetch settings from API
   */
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiService.getSettings();
      setSettings(response.data);
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings. Please try again.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Update settings
   */
  const updateSettings = useCallback(async (newSettings) => {
    setSaving(true);
    try {
      const response = await apiService.updateSettings(newSettings);
      setSettings(response.data);
      setError(null);
      setSuccess('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
      return response.data;
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Failed to save settings. Please try again.');
      return null;
    } finally {
      setSaving(false);
    }
  }, []);
  
  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(async () => {
    setSaving(true);
    try {
      const response = await apiService.resetSettings();
      setSettings(response.data);
      setError(null);
      setSuccess('Settings reset to defaults successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
      return response.data;
    } catch (err) {
      console.error('Error resetting settings:', err);
      setError('Failed to reset settings. Please try again.');
      return null;
    } finally {
      setSaving(false);
    }
  }, []);
  
  // Fetch settings on initial load
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);
  
  return {
    settings,
    loading,
    saving,
    error,
    success,
    fetchSettings,
    updateSettings,
    resetSettings
  };
}
