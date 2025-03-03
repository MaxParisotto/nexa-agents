import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  CircularProgress,
  Card,
  CardContent,
  Button,
  Tooltip,
  Divider,
  Chip
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReactFlow, { 
  Background, 
  Controls,
  MiniMap, 
  Handle, 
  Position 
} from 'reactflow';
import 'reactflow/dist/style.css';
import axios from 'axios';

// Custom node components
const ApiNode = ({ data }) => {
  // Status colors
  const getStatusColor = (status) => {
    if (!status) return '#9e9e9e'; // grey
    if (status === 'up') return '#4caf50'; // green
    if (status === 'degraded') return '#ff9800'; // orange
    return '#f44336'; // red for down
  };

  const getLatencyColor = (latency) => {
    if (latency === null) return '#9e9e9e';
    if (latency < 100) return '#4caf50';
    if (latency < 500) return '#ff9800';
    return '#f44336';
  };

  return (
    <div style={{
      padding: '12px',
      borderRadius: '5px',
      borderWidth: '2px',
      borderStyle: 'solid',
      borderColor: getStatusColor(data.status),
      background: 'white',
      width: '180px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
      fontSize: '12px',
      color: '#333'
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ 
        fontWeight: 'bold',
        borderBottom: '1px solid #eee',
        paddingBottom: '5px',
        marginBottom: '5px'
      }}>
        {data.label}
      </div>
      
      <div style={{ fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Status:</span>
          <span style={{ 
            color: getStatusColor(data.status),
            fontWeight: 'bold'
          }}>
            {data.status ? data.status.toUpperCase() : 'UNKNOWN'}
          </span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Latency:</span>
          <span style={{ 
            color: getLatencyColor(data.latency),
            fontWeight: 'bold'
          }}>
            {data.latency !== null ? `${data.latency}ms` : 'N/A'}
          </span>
        </div>
        
        {data.errorCount > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            color: '#f44336',
            fontWeight: 'bold',
            marginTop: '5px'
          }}>
            <span>Errors:</span>
            <span>{data.errorCount}</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

// Static node types definition to prevent recreation
const nodeTypes = { apiNode: ApiNode };

// System status component
const SystemStatus = () => {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [systemHealth, setSystemHealth] = useState({
    overall: 'unknown',
    endpoints: 0,
    healthy: 0,
    degraded: 0,
    down: 0
  });

  // Endpoints to monitor
  const endpoints = [
    { id: 'main', label: 'Main Backend', url: '/api/status' },
    { id: 'metrics', label: 'Metrics Service', url: '/api/metrics/system' },
    { id: 'tokens', label: 'Token Metrics', url: '/api/metrics/tokens' },
    { id: 'workflows', label: 'Workflow Engine', url: '/api/workflows/debug' },
    { id: 'uplink', label: 'OpenAI Uplink', url: '/api/uplink/status' },
  ];

  // Function to check status of an endpoint
  const checkEndpointStatus = async (endpoint) => {
    try {
      const startTime = performance.now();
      const response = await axios.get(endpoint.url, { timeout: 2000 });
      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);
      
      return {
        status: 'up',
        latency,
        error: null
      };
    } catch (err) {
      // Determine if it's a timeout, connection refused, or other error
      let status = 'down';
      if (err.code === 'ECONNABORTED') {
        status = 'degraded'; // Timeout is considered degraded
      }
      
      return {
        status,
        latency: null,
        error: err.message,
        errorType: err.code
      };
    }
  };

  // Function to check all endpoints and update status
  const checkAllEndpoints = useCallback(async () => {
    setIsLoading(true);
    
    // Check each endpoint
    const results = await Promise.all(
      endpoints.map(async (endpoint) => {
        const status = await checkEndpointStatus(endpoint);
        return {
          ...endpoint,
          ...status,
          errorCount: status.error ? 1 : 0
        };
      })
    );
    
    // Update health stats
    const healthStats = {
      endpoints: endpoints.length,
      healthy: results.filter(r => r.status === 'up').length,
      degraded: results.filter(r => r.status === 'degraded').length,
      down: results.filter(r => r.status === 'down').length
    };
    
    // Calculate overall health
    let overallHealth = 'down';
    if (healthStats.healthy === healthStats.endpoints) {
      overallHealth = 'up';
    } else if (healthStats.healthy > 0 || healthStats.degraded > 0) {
      overallHealth = 'degraded';
    }
    
    healthStats.overall = overallHealth;
    setSystemHealth(healthStats);
    
    // Create nodes for the graph
    const graphNodes = results.map((endpoint, index) => ({
      id: endpoint.id,
      type: 'apiNode',
      data: { 
        label: endpoint.label, 
        status: endpoint.status,
        latency: endpoint.latency,
        errorCount: endpoint.errorCount,
        error: endpoint.error
      },
      position: getNodePosition(index, results.length)
    }));
    
    // Create a central system node
    graphNodes.push({
      id: 'system',
      type: 'apiNode',
      data: { 
        label: 'Nexa System',
        status: overallHealth,
        latency: null,
        errorCount: results.filter(r => r.error).length
      },
      position: { x: 250, y: 250 }
    });
    
    // Create edges connecting the system to each endpoint
    const graphEdges = results.map(endpoint => ({
      id: `system-${endpoint.id}`,
      source: 'system',
      target: endpoint.id,
      animated: endpoint.status === 'up',
      style: { 
        stroke: getEdgeColor(endpoint.status),
        strokeWidth: 2
      }
    }));
    
    setNodes(graphNodes);
    setEdges(graphEdges);
    setLastUpdated(new Date());
    setIsLoading(false);
  }, []);

  // Calculate positions for nodes in a circular layout
  const getNodePosition = (index, total) => {
    const radius = 250;
    const angle = (index / total) * 2 * Math.PI;
    const x = 250 + radius * Math.cos(angle);
    const y = 250 + radius * Math.sin(angle);
    return { x, y };
  };
  
  // Get color for edge based on status
  const getEdgeColor = (status) => {
    if (status === 'up') return '#4caf50';
    if (status === 'degraded') return '#ff9800';
    return '#f44336';
  };

  // Initial check on component mount
  useEffect(() => {
    checkAllEndpoints();
    
    // Set up periodic checks
    const intervalId = setInterval(checkAllEndpoints, 30000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [checkAllEndpoints]);
  
  // Status indicators for the summary
  const StatusIndicator = ({ count, type, color }) => (
    <Chip 
      label={`${count} ${type}`} 
      sx={{ 
        bgcolor: color, 
        color: 'white', 
        fontWeight: 'bold',
        minWidth: '80px'
      }}
    />
  );

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" component="h2">
              System Status Dashboard
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
              </Typography>
              <Button 
                startIcon={<RefreshIcon />}
                variant="outlined"
                size="small"
                onClick={checkAllEndpoints}
                disabled={isLoading}
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Box>
          </Paper>
          
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>System Health</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item>
                <StatusIndicator 
                  count={systemHealth.healthy} 
                  type="Healthy" 
                  color="#4caf50" 
                />
              </Grid>
              <Grid item>
                <StatusIndicator 
                  count={systemHealth.degraded} 
                  type="Degraded" 
                  color="#ff9800" 
                />
              </Grid>
              <Grid item>
                <StatusIndicator 
                  count={systemHealth.down} 
                  type="Down" 
                  color="#f44336" 
                />
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" gutterBottom>
              Endpoint Status
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
              {endpoints.map((endpoint) => {
                const nodeData = nodes.find(n => n.id === endpoint.id)?.data;
                const status = nodeData?.status || 'unknown';
                const statusColor = status === 'up' ? '#4caf50' : 
                                    status === 'degraded' ? '#ff9800' : '#f44336';
                                    
                return (
                  <Card key={endpoint.id} sx={{ width: 220 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {endpoint.label}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Status:
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ fontWeight: 'bold', color: statusColor }}
                        >
                          {status.toUpperCase()}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Latency:
                        </Typography>
                        <Typography variant="body2">
                          {nodeData?.latency !== null ? `${nodeData?.latency}ms` : 'N/A'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Paper>
          
          <Paper sx={{ height: 600, p: 2 }}>
            <Typography variant="h6" gutterBottom>Network Topology</Typography>
            {isLoading && nodes.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ height: 550 }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  fitView
                >
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemStatus;
