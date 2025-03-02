import React, { useEffect } from 'react';
import { Box, Typography, Container, Grid } from '@mui/material';
import { useDispatch } from 'react-redux';
import { startSystemMonitoring } from '../store/actions/systemActions';
import MetricsPanel from '../components/Dashboard/MetricsPanel';
// ... other imports

const Dashboard = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Start monitoring system metrics
    const monitoringInterval = dispatch(startSystemMonitoring());
    
    // Clean up monitoring when component unmounts
    return () => {
      clearInterval(monitoringInterval);
    };
  }, [dispatch]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      
      {/* Use the new MetricsPanel component instead of the old metrics display */}
      <MetricsPanel />
      
      {/* ... rest of the dashboard ... */}
    </Container>
  );
};

export default Dashboard;
