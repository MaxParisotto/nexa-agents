import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Box, Chip, FormControl, InputLabel, Select,
  MenuItem, Grid, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Button, Stack, Divider, Switch, FormControlLabel,
  Card, CardContent, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  FilterList as FilterListIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Clear as ClearIcon,
  TableView as TableViewIcon,
  TextFields as TextFieldsIcon,
  DeleteForever as DeleteForeverIcon
} from '@mui/icons-material';

import LogManager, { LOG_LEVELS, LOG_CATEGORIES } from '../../utils/LogManager';
import XtermLogs from './XtermLogs';
import { formatDate } from '../../shared/utils';

/**
 * LogsPage component - Displays system logs with filtering capabilities
 */
const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isPlainTextView, setIsPlainTextView] = useState(
    localStorage.getItem('logsPlainTextView') === 'true'
  );
  const [isTerminalView, setIsTerminalView] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState('');

  // Load logs on mount
  useEffect(() => {
    const allLogs = LogManager.getAllLogs();
    setLogs(allLogs);
    setFilteredLogs(allLogs);
    
    // Add listener for log updates
    const removeListener = LogManager.addListener((logEntry, action) => {
      if (action === 'clear') {
        setLogs([]);
        setFilteredLogs([]);
      } else if (logEntry) {
        setLogs(prevLogs => {
          const newLogs = [logEntry, ...prevLogs];
          applyFilters(newLogs);
          return newLogs;
        });
      }
    });
    
    // Initialize system logs if none exist
    if (allLogs.length === 0) {
      initializeSystemLogs();
    }
    
    return () => removeListener();
  }, []);

  // Save view preference when it changes
  useEffect(() => {
    localStorage.setItem('logsPlainTextView', isPlainTextView.toString());
  }, [isPlainTextView]);

  // Apply filters when filter selections change
  useEffect(() => {
    applyFilters();
  }, [selectedLevel, selectedCategory, searchQuery, startDate, endDate, logs]);

  // Update terminal logs when filtered logs change
  useEffect(() => {
    if (isTerminalView) {
      const formattedLogs = filteredLogs.map(formatLogEntry).join('\n');
      setTerminalLogs(formattedLogs);
    }
  }, [filteredLogs, isTerminalView]);

  // Initialize system logs if none exist
  const initializeSystemLogs = () => {
    // Log actual system information instead of using mockup data
    const systemInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString()
    };
    
    // Add real system logs
    LogManager.info('SYSTEM', 'Application initialized', { version: process.env.npm_package_version || '0.1.0' });
    LogManager.info('SYSTEM', 'Browser information', systemInfo);
    LogManager.info('NETWORK', 'Checking server connection');
    
    // Attempt to fetch server status to generate real network logs
    fetch('/api/health')
      .then(response => {
        if (response.ok) {
          LogManager.info('NETWORK', 'Connected to server', { status: response.status });
        } else {
          LogManager.warn('NETWORK', 'Server responded with non-OK status', { status: response.status });
        }
        return response.json();
      })
      .then(data => {
        LogManager.debug('API', 'Server health data received', data);
      })
      .catch(error => {
        LogManager.error('NETWORK', 'Failed to connect to server', { error: error.message });
      });
  };

  const handleLevelChange = (event) => {
    setSelectedLevel(event.target.value);
  };

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
  };

  const handleViewToggle = () => {
    setIsPlainTextView(!isPlainTextView);
  };

  const handleTerminalViewToggle = () => {
    setIsTerminalView(!isTerminalView);
  };

  const clearFilters = () => {
    setSelectedLevel('ALL');
    setSelectedCategory('ALL');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const applyFilters = useCallback((logsToFilter = logs) => {
    const filters = {
      levels: selectedLevel === 'ALL' ? [] : [selectedLevel],
      categories: selectedCategory === 'ALL' ? [] : [selectedCategory],
      search: searchQuery,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    };
    
    const filtered = LogManager.filterLogs(filters);
    setFilteredLogs(filtered);
  }, [logs, selectedLevel, selectedCategory, searchQuery, startDate, endDate]);

  const downloadLogs = () => {
    // Format logs for download
    const formattedLogs = filteredLogs.map(formatLogEntry).join('\n');
    
    // Create download link
    const element = document.createElement('a');
    const file = new Blob([formattedLogs], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `logs-${new Date().toISOString().replace(/:/g, '-')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Get severity color based on log level
  const getSeverityColor = (level) => {
    switch (level) {
      case 'ERROR': return 'error';
      case 'WARN': return 'warning';
      case 'INFO': return 'info';
      case 'DEBUG': return 'default';
      default: return 'default';
    }
  };

  // Format a log entry for plain text view
  const formatLogEntry = (log) => {
    const timestamp = formatTimestamp(log.timestamp);
    const dataStr = log.data 
      ? (typeof log.data === 'object' 
        ? JSON.stringify(log.data, null, 2)
        : log.data)
      : '';
    
    return `[${timestamp}] [${log.level}] [${log.category}] ${log.message} ${dataStr}`;
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time';
    try {
      return formatDate(timestamp, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };

  const confirmDeleteAllLogs = () => {
    LogManager.clearLogs();
    closeDeleteDialog();
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>System Logs</Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverIcon />}
            onClick={openDeleteDialog}
            sx={{ ml: 1 }}
          >
            Delete All Logs
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="level-select-label">Level</InputLabel>
              <Select
                labelId="level-select-label"
                value={selectedLevel}
                label="Level"
                onChange={handleLevelChange}
              >
                <MenuItem value="ALL">All Levels</MenuItem>
                {Object.values(LOG_LEVELS).map(level => (
                  <MenuItem key={level} value={level}>{level}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel id="category-select-label">Category</InputLabel>
              <Select
                labelId="category-select-label"
                value={selectedCategory}
                label="Category"
                onChange={handleCategoryChange}
              >
                <MenuItem value="ALL">All Categories</MenuItem>
                {Object.values(LOG_CATEGORIES).map(category => (
                  <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Search logs"
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                endAdornment: searchQuery ? (
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                ) : <SearchIcon fontSize="small" color="action" />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              label="From date"
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              size="small"
              label="To date"
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={1}>
            <Button 
              fullWidth 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={() => applyFilters()}
            >
              Apply
            </Button>
          </Grid>
        </Grid>
        
        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          <Button 
            variant="outlined" 
            color="secondary" 
            startIcon={<ClearIcon />}
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<DownloadIcon />}
            onClick={downloadLogs}
          >
            Export Logs
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<DeleteIcon />}
            onClick={openDeleteDialog}
          >
            Clear All Logs
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={isPlainTextView}
                onChange={handleViewToggle}
                color="primary"
              />
            }
            label={isPlainTextView ? "Plain Text View" : "Table View"}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isTerminalView}
                onChange={handleTerminalViewToggle}
                color="primary"
              />
            }
            label="Terminal View"
          />
        </Stack>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography>
            Showing {filteredLogs.length} of {logs.length} logs
          </Typography>
          
          <Box>
            <IconButton size="small" onClick={() => applyFilters()} title="Refresh Logs">
              <RefreshIcon />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={handleViewToggle} 
              title={isPlainTextView ? "Switch to Table View" : "Switch to Plain Text View"}
              color={isPlainTextView ? "primary" : "default"}
              disabled={isTerminalView}
            >
              {isPlainTextView ? <TableViewIcon /> : <TextFieldsIcon />}
            </IconButton>
          </Box>
        </Box>
        
        {isTerminalView ? (
          // Terminal View
          <XtermLogs logs={terminalLogs} />
        ) : isPlainTextView ? (
          // Plain Text View
          <Card variant="outlined">
            <CardContent sx={{ p: 0 }}>
              <Box 
                component="pre"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
                  color: theme => theme.palette.text.primary,
                  p: 2,
                  m: 0,
                  overflowX: 'auto',
                  height: '500px',
                  overflowY: 'auto',
                  borderRadius: 1,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, index) => (
                    <Box 
                      component="div" 
                      key={`log-text-${index}`}
                      sx={{
                        mb: 1,
                        pb: 1,
                        borderBottom: '1px dashed',
                        borderColor: 'divider',
                        color: log.level === 'ERROR' ? 'error.main' : 
                               log.level === 'WARN' ? 'warning.main' : 
                               log.level === 'INFO' ? 'info.main' : 'text.primary'
                      }}
                    >
                      {formatLogEntry(log)}
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                    {logs.length === 0 ? "No logs available" : "No logs match the current filters"}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        ) : (
          // Table View
          <TableContainer component={Paper} variant="outlined">
            <Table sx={{ minWidth: 650 }} size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log, index) => (
                    <TableRow key={`log-${index}-${log.timestamp}`}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={log.level} 
                          size="small" 
                          color={getSeverityColor(log.level)}
                          variant={log.level === 'ERROR' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>{log.category}</TableCell>
                      <TableCell>{log.message}</TableCell>
                      <TableCell>
                        {log.data ? (
                          <Typography 
                            variant="body2" 
                            sx={{
                              maxWidth: '400px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              fontFamily: 'monospace',
                              fontSize: '0.75rem',
                              bgcolor: 'background.paper',
                              p: 0.5,
                              borderRadius: 1,
                            }}
                            title={typeof log.data === 'object' ? JSON.stringify(log.data) : log.data}
                          >
                            {typeof log.data === 'object' ? JSON.stringify(log.data) : log.data}
                          </Typography>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="textSecondary">
                        {logs.length === 0 ? "No logs available" : "No logs match the current filters"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Delete All Logs
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete all logs? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmDeleteAllLogs} color="error" autoFocus variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LogsPage;
