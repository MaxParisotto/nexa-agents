import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * Error Boundary component for catching and displaying React rendering errors
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // You could also log this to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
            bgcolor: 'background.default'
          }}
        >
          <Paper 
            elevation={3} 
            sx={{ 
              p: 4, 
              maxWidth: 600, 
              width: '100%',
              borderRadius: 2,
              textAlign: 'center'
            }}
          >
            <ErrorOutlineIcon color="error" sx={{ fontSize: 80, mb: 2 }} />
            
            <Typography variant="h5" gutterBottom color="error.main">
              Something went wrong
            </Typography>
            
            <Typography variant="body1" paragraph>
              The application encountered an unexpected error. We're sorry for the inconvenience.
            </Typography>
            
            <Box sx={{ my: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, overflow: 'auto', textAlign: 'left' }}>
              <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
                {this.state.error?.toString()}
              </Typography>
              
              {this.state.errorInfo && (
                <Typography 
                  variant="body2" 
                  component="pre" 
                  sx={{ 
                    fontFamily: 'monospace', 
                    mt: 2, 
                    maxHeight: 200, 
                    overflow: 'auto' 
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </Typography>
              )}
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-around' }}>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<RefreshIcon />} 
                onClick={this.handleRefresh}
              >
                Reload Page
              </Button>
              
              <Button 
                variant="outlined" 
                onClick={this.handleGoHome}
              >
                Go to Home Page
              </Button>
            </Box>
          </Paper>
        </Box>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
