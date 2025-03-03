import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * 404 Not Found page component
 */
export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 'calc(100vh - 120px)' 
      }}
    >
      <Paper 
        elevation={3} 
        sx={{ 
          p: 5, 
          textAlign: 'center',
          borderRadius: 2,
          maxWidth: 500
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
        
        <Typography variant="h4" gutterBottom>
          Page Not Found
        </Typography>
        
        <Typography variant="body1" paragraph sx={{ mb: 4 }}>
          The page you are looking for doesn't exist or has been moved.
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate('/dashboard')}
          sx={{ mr: 2 }}
        >
          Go to Dashboard
        </Button>
        
        <Button 
          variant="outlined" 
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </Paper>
    </Box>
  );
}
