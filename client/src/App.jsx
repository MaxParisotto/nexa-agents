import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';
import { useThemeContext } from './contexts/ThemeContext';

// Layout
import FixedLayout from './components/common/FixedLayout';

// Pages
import Dashboard from './components/dashboard/Dashboard';
import Settings from './components/settings/Settings';
import Benchmark from './components/benchmark/LlmBenchmark';
import GptUplink from './components/integrations/GptUplink';
import Agora from './components/agora/Agora';
import NotFound from './components/common/NotFound';

/**
 * Main application component
 */
export default function App() {
  const { darkMode, toggleDarkMode, theme } = useThemeContext();

  return (
    <>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<FixedLayout darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="benchmark" element={<Benchmark />} />
          <Route path="integrations/gpt-uplink" element={<GptUplink />} />
          <Route path="agora" element={<Agora />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
