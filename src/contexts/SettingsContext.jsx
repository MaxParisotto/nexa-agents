import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

// Create context
const SettingsContext = createContext(null);

/**
 * Custom hook to access settings
 * @throws {Error} If used outside of SettingsProvider
 */
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === null) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

/**
 * Provider component for settings
 * Connects to Redux store and provides settings to components
 */
export const SettingsProvider = ({ children }) => {
  // Get settings from Redux store
  const reduxSettings = useSelector(state => state.settings);
  // Local state for any settings specific to this context
  const [localSettings, setLocalSettings] = useState({});
  
  // Combine Redux settings with local settings
  const settings = {
    ...reduxSettings,
    ...localSettings,
    // Add helper methods
    updateLocalSetting: (key, value) => {
      setLocalSettings(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  // Context value to provide to consumers
  const contextValue = {
    settings,
    isLoading: reduxSettings.loading || false,
    error: reduxSettings.error || null,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
