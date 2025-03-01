import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, Typography, Paper, Grid, Box, 
  Button, TextField, MenuItem, FormControl, InputLabel, Select,
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, IconButton, Switch, FormControlLabel, Card
} from '@mui/material';
import { 
  Refresh as RefreshIcon, 
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ArrowDownward as ArrowDownwardIcon,
  ViewList as ViewListIcon,
  ViewHeadline as ViewHeadlineIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { addNotification } from '../store/actions/systemActions';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error'];
const LOG_COLORS = {
  debug: '#6c757d',
  info: '#0d6efd',
  warn: '#ffc107',
  error: '#dc3545'
};

const Logs = () => {
  const dispatch = useDispatch();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState({
    level: '',
    category: '',
    search: '',
  });
  const [categories, setCategories] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isPlainText, setIsPlainText] = useState(false); // Toggle between table and plain text views
  const [error, setError] = useState(null);
  const logEndRef = useRef(null);
  const refreshTimerRef = useRef(null);
  
  // Fetch logs on component mount and when filter changes
  useEffect(() => {
    fetchLogs();
    
    // Set up auto-refresh
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(fetchLogs, 5000);
    }
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, filter]);
  
  // Scroll to bottom when logs update
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);
  
  // Function to fetch logs from backend
  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build query params for filtering
      const params = new URLSearchParams();
      if (filter.level) params.append('level', filter.level);
      if (filter.category) params.append('category', filter.category);
      if (filter.search) params.append('search', filter.search);
      
      // Make API request
      const response = await axios.get(`/api/logs?${params.toString()}`);
      
      // Update logs state
      if (response.data && Array.isArray(response.data.logs)) {
        setLogs(response.data.logs);
        
        // Extract unique categories
        if (response.data.categories) {
          setCategories(response.data.categories);
        } else {
          // If categories not provided, extract from logs
          const uniqueCategories = [...new Set(response.data.logs
            .map(log => log.category)
            .filter(Boolean))];
          setCategories(uniqueCategories);
        }
      } else {
        // If backend doesn't return logs, use mock data
        const mockLogs = generateMockLogs();
        setLogs(mockLogs);
        const uniqueCategories = [...new Set(mockLogs
          .map(log => log.category)
          .filter(Boolean))];
        setCategories(uniqueCategories);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError('Failed to load logs. Using mock data instead.');
      
      // Fall back to mock data on error
      const mockLogs = generateMockLogs();
      setLogs(mockLogs);
      const uniqueCategories = [...new Set(mockLogs
        .map(log => log.category)
        .filter(Boolean))];
      setCategories(uniqueCategories);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate mock logs for fallback
  const generateMockLogs = () => {
    const now = new Date();
    return [
      {
        id: '1',
        timestamp: new Date(now - 60000).toISOString(),
        level: 'info',
        message: 'Application started',
        category: 'SYSTEM'
      },
      {
        id: '2',
        timestamp: new Date(now - 50000).toISOString(),
        level: 'debug',
        message: 'Configuration loaded successfully',
        category: 'CONFIG'
      },
      {
        id: '3',
        timestamp: new Date(now - 40000).toISOString(),
        level: 'info',
        message: 'Connected to LLM server',
        category: 'LLM'
      },
      {
        id: '4',
        timestamp: new Date(now - 30000).toISOString(),
        level: 'warn',
        message: 'Slow response from model server',
        category: 'LLM'
      },
      {
        id: '5',
        timestamp: new Date(now - 20000).toISOString(),
        level: 'error',
        message: 'Failed to process workflow: invalid node configuration',
        category: 'WORKFLOW',
        meta: { workflowId: 'wf-123', nodeId: 'node-456' }
      }
    ];
  };
  
  // Clear logs
  const handleClearLogs = () => {
    setLogs([]);
    dispatch(addNotification({
      type: 'info',
      message: 'Logs cleared from view'
    }));
  };
  
  // Export logs
  const handleExportLogs = () => {
    try {
      // Create a blob with log data
      const logData = JSON.stringify(logs, null, 2);
      const blob = new Blob([logData], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nexa-logs-${new Date().toISOString().slice(0, 10)}.json`;
      
      // Trigger download and cleanup
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      dispatch(addNotification({
        type: 'success',
        message: 'Logs exported successfully'
      }));
    } catch (err) {
      console.error('Failed to export logs:', err);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to export logs'
      }));
    }
  };
  
  // Filter logs based on specified criteria
  const filteredLogs = logs.filter(log => {
    // Filter by level
    if (filter.level && log.level !== filter.level) {
      return false;
    }
    
    // Filter by category
    if (filter.category && log.category !== filter.category) {
      return false;
    }
    
    // Filter by search term
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      const messageIncludesSearch = log.message?.toLowerCase().includes(searchTerm);
      const categoryIncludesSearch = log.category?.toLowerCase().includes(searchTerm);
      const metaIncludesSearch = JSON.stringify(log.meta)?.toLowerCase().includes(searchTerm);
      
      if (!messageIncludesSearch && !categoryIncludesSearch && !metaIncludesSearch) {
        return false;
      }
    }
    
    return true;
  });
  
  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setFilter({
      level: '',
      category: '',
      search: ''
    });
  };
  
  // Toggle auto-refresh
  const handleAutoRefreshChange = (event) => {
    setAutoRefresh(event.target.checked);
  };
  
  // Toggle between plain text and table view
  const handleViewModeChange = (event) => {
    setIsPlainText(event.target.checked);
  };
  
  // Format a log entry for plain text display
  const formatLogText = (log) => {
    const timestamp = new Date(log.timestamp).toLocaleString();
    const level = log.level.toUpperCase().padEnd(5, ' ');
    const category = log.category?.padEnd(10, ' ') || '-'.padEnd(10, ' ');
    const meta = log.meta ? `\n    ${JSON.stringify(log.meta, null, 2)}` : '';
    
    return `[${timestamp}] ${level} [${category}] ${log.message}${meta}`;
  };
  
  // Get color for log level
  const getLogColor = (level) => {
    return {
      color: LOG_COLORS[level] || 'inherit'
    };
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>System Logs</Typography>
      
      {/* Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box display="flex" gap={2}>
              {/* Log level filter */}
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Level</InputLabel>
                <Select
                  value={filter.level}
                  label="Level"
                  onChange={(e) => handleFilterChange('level', e.target.value)}
                >
                  <MenuItem value="">All Levels</MenuItem>
                  {LOG_LEVELS.map(level => (
                    <MenuItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Category filter */}
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filter.category}
                  label="Category"
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Search input */}
              <TextField
                size="small"
                label="Search"
                value={filter.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                sx={{ flexGrow: 1 }}
                InputProps={{
                  endAdornment: filter.search && (
                    <IconButton size="small" onClick={() => handleFilterChange('search', '')}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  )
                }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={fetchLogs}
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<FilterIcon />}
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<ClearIcon />}
                onClick={handleClearLogs}
              >
                Clear Logs
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<ArrowDownwardIcon />}
                onClick={handleExportLogs}
              >
                Export Logs
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Toggle switches for auto-refresh and view mode */}
      <Box display="flex" gap={3} mb={2}>
        <FormControlLabel
          control={
            <Switch
              checked={autoRefresh}
              onChange={handleAutoRefreshChange}
              color="primary"
            />
          }
          label="Auto-refresh every 5 seconds"
        />
        
        <FormControlLabel
          control={
            <Switch
              checked={isPlainText}
              onChange={handleViewModeChange}
              color="primary"
            />
          }
          label={
            <Box display="flex" alignItems="center" gap={1}>
              {isPlainText ? <ViewHeadlineIcon /> : <ViewListIcon />}
              <span>Plain Text View</span>
            </Box>
          }
        />
      </Box>
      
      {/* Logs view - choose between table and plain text */}
      {isPlainText ? (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper', maxHeight: '70vh', overflow: 'auto' }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
            {filteredLogs.map((log, index) => (
              <div key={log.id || index} style={getLogColor(log.level)}>
                {formatLogText(log)}
              </div>
            ))}
          </pre>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Meta</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map(log => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={log.level.toUpperCase()}
                      size="small"
                      sx={{ bgcolor: LOG_COLORS[log.level], color: 'white' }}
                    />
                  </TableCell>
                  <TableCell>{log.category}</TableCell>
                  <TableCell>{log.message}</TableCell>
                  <TableCell>
                    {log.meta && (
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(log.meta, null, 2)}
                      </pre>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Error message */}
      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <Typography sx={{ mt: 2 }}>
          Loading logs...
        </Typography>
      )}
      
      {/* No logs message */}
      {filteredLogs.length === 0 && !isLoading && (
        <Paper sx={{ p: 2, mt: 2, textAlign: 'center' }}>
          <Typography color="textSecondary">
            No logs found matching your criteria
          </Typography>
        </Paper>
      )}
      
      {/* Scroll to bottom */}
      <div ref={logEndRef} />
    </Container>
  );
};

export default Logs;
