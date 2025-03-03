import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HomeIcon from '@mui/icons-material/Home';

/**
 * NotFound component - Displayed when a page is not found
 */
export default function NotFound() {
  const navigate = useNavigate();
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 135px)' // Account for AppBar and padding
      }}
    >
      <Paper 
        elevation={3}
        sx={{
          p: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 500,
          mx: 'auto'
        }}
      >
        <ErrorOutlineIcon color="error" sx={{ fontSize: 80, mb: 3 }} />
        
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 600 }}>
          404
        </Typography>
        
        <Typography variant="h5" gutterBottom align="center">
          Page Not Found
        </Typography>
        
        <Typography variant="body1" align="center" color="text.secondary" paragraph>
          The page you are looking for might have been removed, had its
          name changed, or is temporarily unavailable.
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<HomeIcon />}
          onClick={() => navigate('/')}
          sx={{ mt: 3 }}
        >
          Back to Dashboard
        </Button>
      </Paper>
    </Box>
  );
}
