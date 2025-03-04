import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from './store';
import App from './App';
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './services/socket.jsx';
import LogManager from './utils/LogManager';
import './index.css';

// Initialize LogManager with store
LogManager.initializeWithStore(store);

// Log initial application start
LogManager.info('SYSTEM', 'Application starting', {
  version: import.meta.env.VITE_APP_VERSION || '0.1.0',
  environment: import.meta.env.MODE,
  timestamp: new Date().toISOString()
});

// Log system information
LogManager.info('SYSTEM', 'System information', {
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  screenSize: `${window.screen.width}x${window.screen.height}`,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
});

// Log network status
LogManager.info('NETWORK', 'Network status', {
  online: navigator.onLine,
  connection: navigator.connection ? {
    effectiveType: navigator.connection.effectiveType,
    downlink: navigator.connection.downlink,
    rtt: navigator.connection.rtt,
    saveData: navigator.connection.saveData
  } : 'Not available'
});

// Configure future flags for React Router v7
const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter future={router.future}>
          <SettingsProvider>
            <ThemeProvider>
              <SocketProvider>
                <App />
              </SocketProvider>
            </ThemeProvider>
          </SettingsProvider>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
