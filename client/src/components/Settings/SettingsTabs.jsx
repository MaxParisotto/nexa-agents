import React, { useState } from 'react';
import { Tabs, Tab, Box, Typography } from '@mui/material';
import UiSettingsForm from './UiSettingsForm';
import SystemSettingsForm from './SystemSettingsForm';
import LlmSettingsForm from './LlmSettingsForm';
import IntegrationSettingsForm from './IntegrationSettingsForm';

/**
 * Settings Tabs Component - Organizes settings into tabs
 * 
 * @param {Object} props - Component props
 * @param {Object} props.settings - Settings object
 * @param {Function} props.onSettingChange - Callback for setting changes
 * @param {boolean} props.darkMode - Current dark mode state
 */
export default function SettingsTabs({ settings, onSettingChange, darkMode }) {
  const [activeTab, setActiveTab] = useState(0);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="System" />
          <Tab label="UI" />
          <Tab label="LLM Providers" />
          <Tab label="Integrations" />
        </Tabs>
      </Box>
      
      {/* System Settings */}
      <TabPanel value={activeTab} index={0}>
        <SystemSettingsForm 
          settings={settings} 
          onSettingChange={onSettingChange}
        />
      </TabPanel>
      
      {/* UI Settings */}
      <TabPanel value={activeTab} index={1}>
        <UiSettingsForm 
          settings={settings} 
          onSettingChange={onSettingChange}
          darkMode={darkMode}
        />
      </TabPanel>
      
      {/* LLM Settings */}
      <TabPanel value={activeTab} index={2}>
        <LlmSettingsForm 
          settings={settings} 
          onSettingChange={onSettingChange}
        />
      </TabPanel>
      
      {/* Integration Settings */}
      <TabPanel value={activeTab} index={3}>
        <IntegrationSettingsForm 
          settings={settings} 
          onSettingChange={onSettingChange}
        />
      </TabPanel>
    </Box>
  );
}

// Tab Panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}
