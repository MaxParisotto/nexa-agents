// Components
import Header from './components/Header.jsx';
import Dock from './components/Dock.jsx';
import Dashboard from './components/Dashboard.jsx';
import WorkflowEditor from './components/WorkflowEditor.jsx';
import Tasks from './components/Tasks.jsx';
import Metrics from './components/Metrics.jsx';
import Logs from './components/Logs.jsx';
import Settings from './components/Settings/Settings.jsx'; // Changed from .js to .jsx
import ChatWidget from './components/ChatWidget.jsx';
import ProjectManager from './components/ProjectManager.jsx'; // Changed from .js to .jsx
import Agora from './components/Agora/Agora.jsx'; // Changed from .js to .jsx
import Agents from './components/Agents/Agents.jsx';
import NotificationsSystem from './components/NotificationsSystem.jsx';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, Button } from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store';
import { SettingsProvider } from './contexts/SettingsContext';
import apiClient, { fetchWithRetry, abortAllRequests } from './utils/apiClient';

// Actions
import { loadSettings, loadPersistedModels } from './store/actions/settingsActions';

// Services
import configService from './services/configService';
import { logInfo, logError, LOG_CATEGORIES } from './store/actions/logActions';
import { addNotification } from './store/actions/systemActions';

// Agents
import projectManagerAgent from './agents/ProjectManagerAgent';

// Utils
import { isServerRunning } from './utils/serverChecker';

// Styling
import './App.css';

/**
 * AppContent component that has access to Redux dispatch
 * Handles configuration loading and theme management
 */
function AppContent() {
  const dispatch = useDispatch();
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
  const settings = useSelector(state => state.settings);
  const [serverStatus, setServerStatus] = useState({ 
    checked: false, 
    online: false,
    checking: true 
  });

  // Use ref to store interval ID
  const serverCheckIntervalRef = useRef(null);

  // Server status check with proper cleanup
  const checkServer = async () => {
    try {
      const status = await fetchWithRetry('/status');
      // Process status response
      setServerStatus({ 
        checked: true, 
        online: status.online, 
        checking: false,
        details: status
      });
      
      // Only show notification if server is offline
      if (!status.online) {
        dispatch(addNotification({
          type: 'warning',
          message: 'Backend connection unavailable',
          description: 'Using local settings. Some features may be limited.',
          duration: 10000 // Show for longer time
        }));
      }
    } catch (error) {
      // Handle error, but don't log if it's an abort error
      if (error.message !== 'request aborted') {
        console.error('Server check failed:', error);
      }
      setServerStatus({ 
        checked: true, 
        online: false, 
        checking: false,
        error: error.message
      });
    }
  };

  useEffect(() => {
    // Initial check
    checkServer();
    
    // Set up interval
    serverCheckIntervalRef.current = setInterval(checkServer, 10000);
    
    // Clean up function
    return () => {
      // Clear interval
      clearInterval(serverCheckIntervalRef.current);
      // Abort any pending requests
      abortAllRequests();
    };
  }, [dispatch]);

  // Load settings and models from backend on startup with better error handling
  useEffect(() => {
    const loadAppSettings = async () => {
      try {
        // Load settings from backend with silent fallback
        await dispatch(loadSettings());
        
        // Also load any cached models
        dispatch(loadPersistedModels());
        
        setIsConfigLoaded(true);
      } catch (error) {
        console.error('Error loading settings:', error);
        
        // We still consider config loaded even if we're using fallback values
        setIsConfigLoaded(true);
        
        // Show a notification only if it's not a connection refused error
        // (since we already show a notification for that)
        if (!error.message?.includes('Connection refused')) {
          dispatch(addNotification({
            type: 'error',
            message: 'Failed to load settings',
            description: 'Using default settings'
          }));
        }
      }
    };
    
    loadAppSettings();
  }, [dispatch]);

  // Create theme based on dark mode preference
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#3f51b5',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
          },
        },
      },
    },
  });

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  useEffect(() => {
    // Initialize Project Manager Agent
    const initializeAgent = async () => {
      try {
        console.log('📱 App: Initializing ProjectManagerAgent from App component');
        const success = await projectManagerAgent.initialize();
        console.log('📱 App: ProjectManagerAgent initialization result:', success);
        
        if (!success) {
          dispatch(addNotification({
            type: 'warning',
            message: 'Project Manager Agent initialized with warnings',
            description: 'Some features may be limited'
          }));
        } else {
          console.log('📱 App: ProjectManagerAgent successfully initialized');
        }
      } catch (error) {
        console.error('📱 App: Error initializing ProjectManagerAgent:', error);
        dispatch(addNotification({
          type: 'error',
          message: 'Failed to initialize Project Manager Agent',
          description: error.message
        }));
      }
    };

    initializeAgent();

    // Cleanup when app unmounts
    return () => {
      console.log('📱 App: Unmounting, cleaning up ProjectManagerAgent');
      projectManagerAgent.destroy();
    };
  }, [dispatch]);

  // Create a server status component to show in the app
  const ServerStatusMessage = useMemo(() => {
    if (serverStatus.checking) {
      return null; // Don't show anything while checking
    }
    
    if (!serverStatus.online) {
      return (
        <Box sx={{ 
          p: 1, 
          bgcolor: 'warning.light', 
          color: 'warning.contrastText',
          borderRadius: 1,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <WarningIcon sx={{ mr: 1 }} />
            <Typography variant="body2">
              Backend server is offline - using local storage data
            </Typography>
          </Box>
          <Button 
            size="small" 
            variant="outlined" 
            color="inherit"
            onClick={async () => {
              setServerStatus(prev => ({ ...prev, checking: true }));
              const status = await apiClient.status.getStatus();
              setServerStatus({ 
                checked: true, 
                online: status.online, 
                checking: false,
                details: status
              });
            }}
          >
            Retry
          </Button>
        </Box>
      );
    }
    
    return null;
  }, [serverStatus]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SettingsProvider>
        <Router>
          <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
            <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
            <div className="app-container">
              <main className="content-full">
                {/* Show server status message when needed */}
                {ServerStatusMessage}
                
                {settings.loading && !isConfigLoaded ? (
                  <div className="loading-container">
                    <p>Loading settings...</p>
                  </div>
                ) : (
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/workflow" element={<WorkflowEditor />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/metrics" element={<Metrics />} />
                    <Route path="/logs" element={<Logs />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/agora" element={<Agora />} />
                    <Route path="/agents" element={<Agents />} />
                    {/* Add catch-all route for 404 errors */}
                    <Route path="*" element={<div>Page not found</div>} />
                  </Routes>
                )}
              </main>
            </div>
            
            {/* Add the dock */}
            <Dock />
            
            {/* ChatWidget component for interaction */}
            <ChatWidget />
            
            {/* ProjectManager handles both agent workflows and user interaction */}
            <ProjectManager />
            
            {/* Notifications system */}
            <NotificationsSystem />
          </div>
        </Router>
      </SettingsProvider>
    </ThemeProvider>
  );
}

/**
 * Main Application component
 * Sets up the Redux provider and renders AppContent
 */
function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}

export default App;
