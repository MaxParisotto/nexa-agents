import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { useThemeContext } from './contexts/ThemeContext';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from './store';
import { SnackbarProvider } from 'notistack';
import ErrorBoundary from './components/common/ErrorBoundary';

// Layout
import FixedLayout from './components/common/FixedLayout';

// Pages
import Dashboard from './components/dashboard/Dashboard';
import Settings from './components/Settings/Settings';
import Benchmark from './components/benchmark/LlmBenchmark';
import GptUplink from './components/integrations/GptUplink';
import Agora from './components/agora/Agora';
import MetricsPage from './components/metrics/MetricsPage';
import Workflows from './components/workflows/Workflows';
import WorkflowDetail from './components/workflows/WorkflowDetail';
import LogsPage from './components/features/LogsPage';
import AgentsPage from './components/agents/AgentsPage';
import ToolsPage from './components/tools/ToolsPage';
import NotFound from './components/common/NotFound';

/**
 * Main application component
 */
export default function App() {
  const { darkMode, toggleDarkMode, theme } = useThemeContext();

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <SnackbarProvider 
              maxSnack={5}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              autoHideDuration={3000}
            >
              <CssBaseline />
              <Routes>
                <Route path="/" element={<FixedLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="benchmark" element={<Benchmark />} />
                  <Route path="metrics" element={<MetricsPage />} />
                  <Route path="integrations/gpt-uplink" element={<GptUplink />} />
                  <Route path="agora" element={<Agora />} />
                  <Route path="workflows" element={<Workflows />} />
                  <Route path="workflows/:id" element={<WorkflowDetail />} />
                  <Route path="logs" element={<LogsPage />} />
                  <Route path="agents" element={<AgentsPage />} />
                  <Route path="tools" element={<ToolsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </SnackbarProvider>
          </PersistGate>
        </Provider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
