import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Grid, Paper, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Timeline as TimelineIcon,
  Group as GroupIcon,
  Assignment as TaskIcon,
  Memory as MemoryIcon
} from '@mui/icons-material';
import { startSystemMonitoring } from '../../store/actions/systemActions';
import { fetchAgents } from '../../store/actions/agentActions';
import { fetchTasks } from '../../store/actions/taskActions';

const Item = styled(Paper)(({ theme }) => ({
  ...theme.typography.body2,
  padding: theme.spacing(3),
  color: theme.palette.text.secondary,
}));

const MetricBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

const IconWrapper = styled(Box)(({ theme, color }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: color,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1),
  color: theme.palette.common.white,
}));

const Dashboard = () => {
  const dispatch = useDispatch();
  const metrics = useSelector((state) => state.system.metrics);
  const agents = useSelector((state) => state.agents.agents);
  const tasks = useSelector((state) => state.tasks.tasks);
  const websocketStatus = useSelector((state) => state.system.websocketStatus);

  useEffect(() => {
    const metricsInterval = dispatch(startSystemMonitoring());
    dispatch(fetchAgents());
    dispatch(fetchTasks());

    return () => {
      if (metricsInterval) {
        clearInterval(metricsInterval);
      }
    };
  }, [dispatch]);

  const metricCards = [
    {
      title: 'Active Agents',
      value: metrics.activeAgents,
      icon: <GroupIcon />,
      color: '#4caf50'
    },
    {
      title: 'Pending Tasks',
      value: metrics.pendingTasks,
      icon: <TaskIcon />,
      color: '#2196f3'
    },
    {
      title: 'CPU Usage',
      value: Math.round(metrics.cpuUsage) + '%',
      icon: <MemoryIcon />,
      color: '#ff9800'
    },
    {
      title: 'Memory Usage',
      value: Math.round(metrics.memoryUsage) + '%',
      icon: <TimelineIcon />,
      color: '#f44336'
    }
  ];

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Overview
      </Typography>
      
      {/* Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metricCards.map((metric) => (
          <Grid item xs={12} sm={6} md={3} key={metric.title}>
            <Item elevation={3}>
              <MetricBox>
                <IconWrapper color={metric.color}>
                  {metric.icon}
                </IconWrapper>
                <Box>
                  <Typography variant="h6" component="div">
                    {metric.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {metric.title}
                  </Typography>
                </Box>
              </MetricBox>
            </Item>
          </Grid>
        ))}
      </Grid>

      {/* Status Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Item elevation={3}>
            <Typography variant="h6" gutterBottom>
              Agent Status
            </Typography>
            <Typography variant="body1">
              Total Agents: {agents.length}
            </Typography>
            <Typography variant="body1">
              Active: {agents.filter(a => a.status === 'idle' || a.status === 'busy').length}
            </Typography>
            <Typography variant="body1">
              Error: {agents.filter(a => a.status === 'error').length}
            </Typography>
          </Item>
        </Grid>
        <Grid item xs={12} md={6}>
          <Item elevation={3}>
            <Typography variant="h6" gutterBottom>
              Task Overview
            </Typography>
            <Typography variant="body1">
              Total Tasks: {tasks.length}
            </Typography>
            <Typography variant="body1">
              In Progress: {tasks.filter(t => t.status === 'in_progress').length}
            </Typography>
            <Typography variant="body1">
              Completed: {tasks.filter(t => t.status === 'completed').length}
            </Typography>
          </Item>
        </Grid>
        <Grid item xs={12}>
          <Item elevation={3}>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            <Typography variant="body1">
              WebSocket Connection: {websocketStatus}
            </Typography>
            <Typography variant="body1">
              Last Updated: {new Date().toLocaleTimeString()}
            </Typography>
          </Item>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
