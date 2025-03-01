// Components
import Header from './components/Header.jsx';
import Dock from './components/Dock.jsx';
import Dashboard from './components/Dashboard.jsx';
import WorkflowEditor from './components/WorkflowEditor.jsx';
import Tasks from './components/Tasks.jsx';
import Metrics from './components/Metrics.jsx';
import Logs from './components/Logs.jsx';
import Settings from './components/Settings.jsx';
import ChatWidget from './components/ChatWidget.jsx';
import ProjectManager from './components/ProjectManager.jsx'; // Changed from .js to .jsx
import Agora from './components/Agora/Agora.jsx'; // Changed from .js to .jsx
import Agents from './components/Agents/Agents.jsx';
import NotificationsSystem from './components/NotificationsSystem.jsx';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store';

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
  const [serverStatus, setServerStatus] = useState({ checked: false, running: false });

  // Check if the server is running
  useEffect(() => {
    const checkServer = async () => {
      const running = await isServerRunning();
      setServerStatus({ checked: true, running });
      
      if (!running) {
        dispatch(addNotification({
          type: 'warning',
          message: 'Backend connection unavailable',
          description: 'Using local settings. Some features may be limited.'
        }));
      }
    };
    
    checkServer();
  }, [dispatch]);

  // Load settings and models from backend on startup
  useEffect(() => {
    const loadAppSettings = async () => {
      try {
        // Load settings from backend with silent fallback
        await dispatch(loadSettings());
        
        // Also load any cached models
        dispatch(loadPersistedModels());
        
        setIsConfigLoaded(true);
      } catch (error) {
        // We still consider config loaded even if we're using fallback values
        setIsConfigLoaded(true);
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
          <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
          <div className="app-container">
            <main className="content-full">
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
