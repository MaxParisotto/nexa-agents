import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { SocketProvider } from './services/socket';
import { MetricsProvider } from './services/metrics';

// Layout components
import Layout from './components/common/Layout';

// Page components
import Dashboard from './components/dashboard/Dashboard';
import Workflows from './components/workflows/Workflows';
import WorkflowDetail from './components/workflows/WorkflowDetail';
import Settings from './components/settings/Settings';
import MetricsPage from './components/metrics/MetricsPage';
import NotFound from './components/common/NotFound';

import './App.css';

function App() {
  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#4a76a8',
      },
      secondary: {
        main: '#f50057',
      },
    },
  });

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', String(!darkMode));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SocketProvider>
        <MetricsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="workflows" element={<Workflows />} />
                <Route path="workflows/:id" element={<WorkflowDetail />} />
                <Route path="metrics" element={<MetricsPage />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </MetricsProvider>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
