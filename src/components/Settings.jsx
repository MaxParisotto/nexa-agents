import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import SettingsForm from './Settings/SettingsForm';
import SettingsTerminal from './Settings/SettingsTerminal';
import { SettingsProvider } from './Settings/SettingsContext';

const Settings = () => {

  return (
    <SettingsProvider>
      <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            System Settings
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            Configure system-wide settings and integrations
          </Typography>
        </Paper>
      </Grid>

      <Grid item xs={12} md={8}>
        <SettingsForm />
      </Grid>

      <Grid item xs={12} md={4}>
        <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
          <Typography variant="h6" gutterBottom>
            OpenAI Connection Status
          </Typography>
          <SettingsTerminal />
        </Paper>
      </Grid>
      </Grid>
    </SettingsProvider>
  );
};

export default Settings;
