import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store';

// Components
import Header from './components/Header';
import Dock from './components/Dock';
import Dashboard from './components/Dashboard';
import Agents from './components/Agents';
import Tasks from './components/Tasks';
import Metrics from './components/Metrics';
import Logs from './components/Logs';
import Settings from './components/Settings';
import ChatWidget from './components/ChatWidget';
import ProjectManagerChat from './components/ProjectManagerChat';
import ProjectManager from './components/ProjectManager';
import NotificationsSystem from './components/NotificationsSystem';

// Actions
import { loadConfigFromFile } from './store/actions/settingsActions';

// Services
import configService from './services/configService';
import { logInfo, logError, LOG_CATEGORIES } from './store/actions/logActions';
import { addNotification } from './store/actions/systemActions';

// Agents
import projectManagerAgent from './agents/ProjectManagerAgent';

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
  const configStatus = useSelector(state => ({
    loading: state.settings.configLoading,
    error: state.settings.configError
  }));

  // Load configuration from file on startup
  useEffect(() => {
    const loadConfig = async () => {
      try {
        dispatch(logInfo(LOG_CATEGORIES.SETTINGS, 'Initializing application configuration'));
        
        // Use the Redux action which will update state and handle errors
        dispatch(loadConfigFromFile());
        
        setIsConfigLoaded(true);
      } catch (error) {
        dispatch(logError(LOG_CATEGORIES.SETTINGS, 'Failed to initialize configuration', error));
        dispatch(addNotification({
          type: 'error',
          message: 'Failed to load configuration. Using defaults.'
        }));
      }
    };
    
    loadConfig();
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
        const success = await projectManagerAgent.initialize();
        if (!success) {
          dispatch(addNotification({
            type: 'warning',
            message: 'Project Manager Agent initialized with warnings',
            description: 'Some features may be limited'
          }));
        } else {
          dispatch(logInfo(
            LOG_CATEGORIES.AGENT,
            'Project Manager Agent initialized successfully'
          ));
        }
      } catch (error) {
        dispatch(logError(
          LOG_CATEGORIES.AGENT,
          'Failed to initialize Project Manager Agent',
          { error: error.message }
        ));
        dispatch(addNotification({
          type: 'error',
          message: 'Project Manager Agent initialization failed',
          description: error.message
        }));
      }
    };

    initializeAgent();
    
    // Cleanup on unmount
    return () => {
      projectManagerAgent.destroy();
    };
  }, [dispatch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
          <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
          <div className="app-container">
            <main className="content-full">
              {configStatus.loading ? (
                <div className="loading-container">
                  <p>Loading configuration...</p>
                </div>
              ) : (
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/metrics" element={<Metrics />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              )}
            </main>
          </div>
          
          {/* Add the dock */}
          <Dock />
          
          {/* ChatWidget component for interaction */}
          <ChatWidget />
          
          {/* ProjectManagerChat component for interaction with the Project Manager agent */}
          <ProjectManagerChat />
          
          {/* ProjectManager is a non-visual component that manages agent workflows */}
          <ProjectManager />
          
          {/* Notifications system */}
          <NotificationsSystem />
        </div>
      </Router>
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
