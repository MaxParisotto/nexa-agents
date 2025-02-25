import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
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
import ProjectManager from './components/ProjectManager';
import NotificationsSystem from './components/NotificationsSystem';

// Styling
import './App.css';

/**
 * Main Application component
 * Sets up the theme, routes, and global components
 */
function App() {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

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

  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <div className={`app ${darkMode ? 'dark-mode' : ''}`}>
            <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
            <div className="app-container">
              <main className="content-full">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/metrics" element={<Metrics />} />
                  <Route path="/logs" element={<Logs />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
            </div>
            
            {/* Add the dock */}
            <Dock />
            
            {/* ChatWidget component for interaction */}
            <ChatWidget />
            
            {/* ProjectManager is a non-visual component that manages agent workflows */}
            <ProjectManager />
            
            {/* Notifications system */}
            <NotificationsSystem />
          </div>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
