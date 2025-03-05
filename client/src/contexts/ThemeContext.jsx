import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { useSettings } from './SettingsContext';

// Create context
const ThemeContext = createContext();

/**
 * ThemeProvider component for managing theme preferences
 */
export const ThemeProvider = ({ children }) => {
  // Get settings from context
  const { settings } = useSettings();
  
  // State for theme
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode
  const [primaryColor, setPrimaryColor] = useState('#4a76a8');
  const [secondaryColor, setSecondaryColor] = useState('#ffc107');
  
  // Update theme state from settings
  useEffect(() => {
    if (settings?.theme) {
      setDarkMode(settings.theme.darkMode !== false); // Default to dark if not specified
      setPrimaryColor(settings.theme.primaryColor || '#4a76a8');
      setSecondaryColor(settings.theme.secondaryColor || '#ffc107');
    }
  }, [settings?.theme]);
  
  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);
  
  // Create MUI theme based on current settings
  const theme = useMemo(() => {
    return createTheme({
      palette: {
        mode: darkMode ? 'dark' : 'light',
        primary: {
          main: primaryColor,
        },
        secondary: {
          main: secondaryColor,
        },
        background: {
          default: darkMode ? '#121212' : '#f5f5f5',
          paper: darkMode ? '#1e1e1e' : '#ffffff',
        },
      },
      shape: {
        borderRadius: 8,
      },
      typography: {
        fontFamily: settings?.theme?.fontFamily || 'Roboto, sans-serif',
        fontSize: 
          settings?.theme?.fontSize === 'small' ? 12 :
          settings?.theme?.fontSize === 'large' ? 16 : 
          14, // Default medium
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: 8,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              backgroundImage: 'none',
            },
          },
        },
      },
    });
  }, [darkMode, primaryColor, secondaryColor, settings?.theme]);

  // Context value
  const value = {
    darkMode,
    toggleDarkMode,
    primaryColor,
    secondaryColor,
    theme, // Provide theme to consumers
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Custom hook for using theme context
export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
