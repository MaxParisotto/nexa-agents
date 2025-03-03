import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, useMediaQuery } from '@mui/material';
import { deepPurple, amber } from '@mui/material/colors';

// Create context
const ThemeContext = createContext({
  darkMode: false,
  toggleDarkMode: () => {},
  setThemeMode: () => {}
});

/**
 * Theme Provider component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export function ThemeProvider({ children }) {
  // Check system preference initially
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Initialize dark mode from local storage or system preference
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? savedMode === 'true' : prefersDarkMode;
  });

  // Update local storage when dark mode changes
  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);
  
  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only update if user hasn't explicitly set a preference
      if (localStorage.getItem('darkMode') === null) {
        setDarkMode(e.matches);
      }
    };
    
    // Add listener for system preference changes
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for browsers that use deprecated API
      mediaQuery.addListener(handleChange);
    }
    
    // Cleanup
    return () => {
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };
  
  // Set specific theme mode
  const setThemeMode = (mode) => {
    setDarkMode(mode === 'dark');
  };

  // Create theme based on dark mode preference
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: darkMode ? deepPurple[300] : deepPurple[700],
          },
          secondary: {
            main: darkMode ? amber[300] : amber[700],
          },
          background: {
            default: darkMode ? '#121212' : '#f5f5f5',
            paper: darkMode ? '#1e1e1e' : '#ffffff',
          },
          error: {
            main: '#f44336',
          },
          warning: {
            main: '#ff9800',
          },
          info: {
            main: '#2196f3',
          },
          success: {
            main: '#4caf50',
          },
        },
        typography: {
          fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
          ].join(','),
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
                borderRadius: 8,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                overflow: 'hidden',
              },
            },
          },
        },
      }),
    [darkMode]
  );

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, setThemeMode }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

/**
 * Hook for using theme context
 */
export function useThemeContext() {
  return useContext(ThemeContext);
}

// Default export for backward compatibility
export default ThemeContext;
