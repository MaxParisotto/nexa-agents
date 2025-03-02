import React, { useState } from 'react';
import { Container, Typography, Box, Tabs, Tab } from '@mui/material';
import GeneralSettings from './GeneralSettings';
import LlmSettings from './LlmSettings';
import LogSettingsPanel from './LogSettingsPanel';
import FeatureToggles from './FeatureToggles';
import SettingsTerminal from './SettingsTerminal';
import { SettingsProvider } from '../../contexts/SettingsContext';

/**
 * Settings page component
 */
const Settings = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <SettingsProvider>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="General" />
            <Tab label="LLM Providers" />
            <Tab label="Logs" />
            <Tab label="Features" />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Box>
            <GeneralSettings />
            
            <Box sx={{ mt: 4, mb: 2 }}>
              <Typography variant="h6">Current Settings</Typography>
              <SettingsTerminal />
            </Box>
          </Box>
        )}
        
        {activeTab === 1 && (
          <LlmSettings />
        )}
        
        {activeTab === 2 && (
          <LogSettingsPanel />
        )}
        
        {activeTab === 3 && (
          <FeatureToggles />
        )}
      </Container>
    </SettingsProvider>
  );
};

export default Settings;
