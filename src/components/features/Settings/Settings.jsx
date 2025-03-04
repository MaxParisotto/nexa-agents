import React, { useState } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Typography, 
  Paper
} from '@mui/material';
import GeneralSettings from './GeneralSettings';
import ApiKeySettings from './ApiKeySettings';
import ModelSettings from './ModelSettings';
import AppearanceSettings from './AppearanceSettings';
import AdvancedSettings from './AdvancedSettings';
import SystemStatus from './SystemStatus';

// Tab Panel Component
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
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

const Settings = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ mb: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={value} 
            onChange={handleChange} 
            aria-label="settings tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="General" {...a11yProps(0)} />
            <Tab label="API Keys" {...a11yProps(1)} />
            <Tab label="Models" {...a11yProps(2)} />
            <Tab label="Appearance" {...a11yProps(3)} />
            <Tab label="Advanced" {...a11yProps(4)} />
            <Tab label="System Status" {...a11yProps(5)} />
          </Tabs>
        </Box>
      </Paper>

      <TabPanel value={value} index={0}>
        <GeneralSettings />
      </TabPanel>
      
      <TabPanel value={value} index={1}>
        <ApiKeySettings />
      </TabPanel>
      
      <TabPanel value={value} index={2}>
        <ModelSettings />
      </TabPanel>
      
      <TabPanel value={value} index={3}>
        <AppearanceSettings />
      </TabPanel>
      
      <TabPanel value={value} index={4}>
        <AdvancedSettings />
      </TabPanel>
      
      <TabPanel value={value} index={5}>
        <SystemStatus />
      </TabPanel>
    </Box>
  );
};

export default Settings;
