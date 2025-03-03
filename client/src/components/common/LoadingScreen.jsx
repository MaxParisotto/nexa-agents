import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Loading screen component to display while loading data
 * 
 * @param {Object} props - Component props
 * @param {string} [props.message='Loading...'] - Message to display
 */
function LoadingScreen({ message = 'Loading...' }) {
  return (
    <Box 
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 100px)',
        width: '100%',
      }}
    >
      <CircularProgress size={60} thickness={4} />
      <Typography variant="h6" sx={{ mt: 3 }}>
        {message}
      </Typography>
    </Box>
  );
}

export default LoadingScreen;
