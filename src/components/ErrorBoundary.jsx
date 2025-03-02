import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, m: 2 }}>
          <Paper sx={{ p: 3, bgcolor: 'error.light' }}>
            <Typography variant="h5" component="h2" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" paragraph>
              There was an error rendering this component.
            </Typography>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              backgroundColor: 'rgba(0,0,0,0.1)', 
              padding: '1rem',
              borderRadius: '4px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {this.state.error?.toString() || 'Unknown error'}
            </pre>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Reload Page
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
