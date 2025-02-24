import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Route, Routes, BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import DashboardLayout from './components/Layout/DashboardLayout';
import Dashboard from './components/Dashboard/Dashboard';
import Agents from './components/Agents';
import Tasks from './components/Tasks';
import Settings from './components/Settings';
import Logs from './components/Logs';
import { updateSettings } from './store/actions/settingsActions';
import websocketService from './services/websocket';

const App = () => {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings);

  useEffect(() => {
    // Load settings from localStorage
    const storedSettings = localStorage.getItem('settings');
    if (storedSettings) {
      dispatch(updateSettings(JSON.parse(storedSettings)));
    }

    // Initialize WebSocket connection
    websocketService.connect();

    // Clean up WebSocket connection on unmount
    return () => {
      websocketService.disconnect();
    };
  }, [dispatch]);

  const theme = createTheme({
    palette: {
      mode: 'light',
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <DashboardLayout>
          <Routes>
            <Route exact path="/" element={<Dashboard />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </DashboardLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
