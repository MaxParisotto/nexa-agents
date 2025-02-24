import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  OutlinedInput,
  Button
} from '@mui/material';
import {
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { clearLogs, setLogFilter, LOG_LEVELS, LOG_CATEGORIES } from '../store/actions/logActions';
import { getFilteredLogs } from '../store/reducers/logsReducer';

const levelColors = {
  [LOG_LEVELS.ERROR]: '#f44336',
  [LOG_LEVELS.WARN]: '#ff9800',
  [LOG_LEVELS.INFO]: '#2196f3',
  [LOG_LEVELS.DEBUG]: '#4caf50'
};

const LogEntry = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        mb: 1,
        borderLeft: 4,
        borderColor: levelColors[log.level]
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={3}>
          <Typography variant="caption" color="textSecondary">
            {new Date(log.timestamp).toLocaleString()}
          </Typography>
        </Grid>
        <Grid item xs={6} sm={2}>
          <Chip
            label={log.level.toUpperCase()}
            size="small"
            sx={{
              bgcolor: levelColors[log.level],
              color: 'white'
            }}
          />
        </Grid>
        <Grid item xs={6} sm={2}>
          <Chip
            label={log.category}
            size="small"
            variant="outlined"
          />
        </Grid>
        <Grid item xs={10}>
          <Typography>{log.message}</Typography>
        </Grid>
        <Grid item xs={2} container justifyContent="flex-end">
          {log.details && (
            <IconButton 
              size="small" 
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Grid>
      </Grid>
      
      {expanded && log.details && (
        <Box sx={{ mt: 2, bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(log.details, null, 2)}
          </pre>
        </Box>
      )}
    </Paper>
  );
};

const Logs = () => {
  const dispatch = useDispatch();
  const logs = useSelector(state => getFilteredLogs(state.logs));
  const filters = useSelector(state => state.logs.filters);
  const [showFilters, setShowFilters] = useState(true);

  const handleFilterChange = (filterType, value) => {
    dispatch(setLogFilter({ [filterType]: value }));
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      dispatch(clearLogs());
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2">
              System Logs
            </Typography>
            <Box>
              <IconButton onClick={() => setShowFilters(!showFilters)} sx={{ mr: 1 }}>
                <FilterIcon />
              </IconButton>
              <IconButton onClick={handleClearLogs} color="error">
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>

          {showFilters && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Log Levels</InputLabel>
                  <Select
                    multiple
                    value={filters.levels}
                    onChange={(e) => handleFilterChange('levels', e.target.value)}
                    input={<OutlinedInput label="Log Levels" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip
                            key={value}
                            label={value.toUpperCase()}
                            size="small"
                            sx={{
                              bgcolor: levelColors[value],
                              color: 'white'
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  >
                    {Object.values(LOG_LEVELS).map((level) => (
                      <MenuItem key={level} value={level}>
                        {level.toUpperCase()}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Categories</InputLabel>
                  <Select
                    multiple
                    value={filters.categories}
                    onChange={(e) => handleFilterChange('categories', e.target.value)}
                    input={<OutlinedInput label="Categories" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {Object.values(LOG_CATEGORIES).map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="Start Date"
                    value={filters.startDate}
                    onChange={(date) => handleFilterChange('startDate', date)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="End Date"
                    value={filters.endDate}
                    onChange={(date) => handleFilterChange('endDate', date)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Search Logs"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Grid>
            </Grid>
          )}

          <Box sx={{ mt: 2 }}>
            {logs.length === 0 ? (
              <Typography variant="body1" color="textSecondary" align="center">
                No logs found
              </Typography>
            ) : (
              logs.map((log) => (
                <LogEntry key={log.id} log={log} />
              ))
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Logs;
