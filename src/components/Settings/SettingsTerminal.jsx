import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useSettings } from '../../contexts/SettingsContext';

/**
 * Terminal-like component that displays current settings
 */
const SettingsTerminal = () => {
  // This is where the error occurs - useSettings is called but not in a SettingsProvider
  const { settings } = useSettings();
  
  // Format settings for display
  const formatSettings = () => {
    try {
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      return `Error formatting settings: ${error.message}`;
    }
  };
  
  return (
    <Paper
      elevation={0}
      sx={{
        backgroundColor: 'black',
        color: '#00ff00',
        p: 2,
        borderRadius: 1,
        fontFamily: 'monospace',
        overflow: 'auto',
        maxHeight: '300px'
      }}
    >
      <Typography component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
        {formatSettings()}
      </Typography>
    </Paper>
  );
};

export default SettingsTerminal;
