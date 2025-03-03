import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';

// Import theme context
import { useThemeContext } from './contexts/ThemeContext';

// Import layout components
import Layout from './components/common/Layout';
import NotFound from './components/common/NotFound';

// Import page components 
import Dashboard from './components/dashboard/Dashboard';
import Workflows from './components/workflows/Workflows';
import WorkflowDetail from './components/workflows/WorkflowDetail';
import MetricsPage from './components/metrics/MetricsPage';
import Settings from './components/settings/Settings';
import LlmBenchmark from './components/benchmark/LlmBenchmark';
import GptUplink from './components/integration/GptUplink';

// Import styles
import './styles/App.css';

/**
 * Main App component - Sets up routing and layout
 */
function App() {
  const { darkMode, toggleDarkMode } = useThemeContext();

  return (
    <>
      <CssBaseline />
      <div className="App">
        <Routes>
          <Route path="/" element={<Layout darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}>
            {/* Redirect root to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Main routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/workflows/:id" element={<WorkflowDetail />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/benchmark" element={<LlmBenchmark />} />
            <Route path="/integration" element={<GptUplink />} />
            
            {/* 404 Page */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </div>
    </>
  );
}

export default App;
