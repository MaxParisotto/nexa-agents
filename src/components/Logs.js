import React, { useState, useEffect, useRef } from 'react';
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
  Button,
  Switch,
  FormControlLabel,
  Tooltip,
  useTheme,
  CircularProgress
} from '@mui/material';
import {
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentCopy as ContentCopyIcon,
  TextFormat as TextFormatIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { clearLogs, setLogFilter, LOG_LEVELS, LOG_CATEGORIES } from '../store/actions/logActions';
import { getFilteredLogs } from '../store/reducers/logsReducer';
import Editor from '@monaco-editor/react';

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

// Simple loading component for Monaco editor
const EditorLoading = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100%',
      width: '100%'
    }}
  >
    <CircularProgress size={40} />
  </Box>
);

const Logs = () => {
  const dispatch = useDispatch();
  const logs = useSelector(state => getFilteredLogs(state.logs));
  const filters = useSelector(state => state.logs.filters);
  const [showFilters, setShowFilters] = useState(true);
  const [textView, setTextView] = useState(false);
  const theme = useTheme();
  
  const [editorOptions] = useState({
    readOnly: true,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontSize: 13,
    wordWrap: 'on',
    lineNumbers: 'on',
    folding: true,
    automaticLayout: true
  });

  const handleFilterChange = (filterType, value) => {
    dispatch(setLogFilter({ [filterType]: value }));
  };

  const handleClearLogs = () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      dispatch(clearLogs());
    }
  };

  /**
   * Formats logs as plain text for easy copying and sharing
   * @returns {string} Plain text representation of filtered logs
   */
  const getPlainTextLogs = () => {
    if (!logs || logs.length === 0) {
      return "// No logs available";
    }
    
    return logs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      let textLog = `[${timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}`;
      
      if (log.details) {
        // Handle different types of details
        if (typeof log.details === 'string') {
          textLog += `\nDetails: ${log.details}`;
        } else if (Array.isArray(log.details)) {
          // Format arrays with proper indentation
          const formattedArray = log.details.map(item => 
            typeof item === 'object' ? JSON.stringify(item, null, 2) : `  "${item}"`
          ).join('\n  ');
          textLog += `\nDetails: [\n  ${formattedArray}\n]`;
        } else {
          // Format objects with proper indentation
          const detailsString = JSON.stringify(log.details, null, 2);
          // Add indentation to each line for better readability
          const indentedDetails = detailsString
            .split('\n')
            .map((line, index) => index === 0 ? line : `  ${line}`)
            .join('\n');
          textLog += `\nDetails: ${indentedDetails}`;
        }
      }
      
      return textLog;
    }).join('\n\n');
  };

  /**
   * Copies text logs to clipboard
   */
  const copyLogsToClipboard = () => {
    const textLogs = getPlainTextLogs();
    navigator.clipboard.writeText(textLogs)
      .then(() => {
        alert('Logs copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy logs: ', err);
        alert('Failed to copy logs to clipboard');
      });
  };

  /**
   * Toggles between text view and card view
   */
  const handleToggleTextView = (e) => {
    const newValue = typeof e === 'boolean' ? e : e.target.checked;
    setTextView(newValue);
  };

  /**
   * Handles editor mounting
   * @param {Object} editor - Monaco editor instance
   * @param {Object} monaco - Monaco API
   */
  const handleEditorDidMount = (editor, monaco) => {
    // Configure editor when it mounts
    setTimeout(() => {
      // Add custom syntax highlighting for log levels
      monaco.editor.defineTheme('logTheme', {
        base: theme.palette.mode === 'dark' ? 'vs-dark' : 'vs',
        inherit: true,
        rules: [
          { token: 'error', foreground: levelColors[LOG_LEVELS.ERROR].substring(1), fontStyle: 'bold' },
          { token: 'warn', foreground: levelColors[LOG_LEVELS.WARN].substring(1), fontStyle: 'bold' },
          { token: 'info', foreground: levelColors[LOG_LEVELS.INFO].substring(1) },
          { token: 'debug', foreground: levelColors[LOG_LEVELS.DEBUG].substring(1) },
        ],
        colors: {}
      });
      
      monaco.editor.setTheme('logTheme');
      
      // Register a simple language for logs
      monaco.languages.register({ id: 'logs' });
      monaco.languages.setMonarchTokensProvider('logs', {
        tokenizer: {
          root: [
            [/\[ERROR\]/, 'error'],
            [/\[WARN\]/, 'warn'],
            [/\[INFO\]/, 'info'],
            [/\[DEBUG\]/, 'debug'],
            [/\[\d{1,2}\/\d{1,2}\/\d{4}.*?\]/, 'date'],
            [/\[.*?\]/, 'category'],
            [/".*?"/, 'string'],
            [/\{|\}|\[|\]/, 'bracket'],
            [/\b(true|false|null)\b/, 'keyword'],
            [/\b\d+\b/, 'number'],
          ]
        }
      });
    }, 100);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h2">
              System Logs
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  bgcolor: textView ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                  borderRadius: 1,
                  p: 0.5
                }}
              >
                <Tooltip title={textView ? "Switch to card view" : "Switch to Monaco editor view"}>
                  <IconButton 
                    size="small" 
                    sx={{ 
                      mr: 0.5,
                      color: textView ? 'primary.main' : 'action.active'
                    }}
                    onClick={() => handleToggleTextView(!textView)}
                  >
                    {textView ? <CodeIcon /> : <TextFormatIcon />}
                  </IconButton>
                </Tooltip>
                <Switch
                  checked={textView}
                  onChange={handleToggleTextView}
                  color="primary"
                  size="small"
                  sx={{ mr: 0.5 }}
                />
              </Box>
              {textView && (
                <Tooltip title="Copy logs to clipboard">
                  <IconButton onClick={copyLogsToClipboard} sx={{ mr: 1 }}>
                    <ContentCopyIcon />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton 
                onClick={() => setShowFilters(!showFilters)} 
                sx={{ 
                  mr: 1,
                  bgcolor: showFilters ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                  color: showFilters ? 'primary.main' : 'action.active'
                }}
              >
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
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>

              <Grid item xs={12} md={3}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="End Date"
                    value={filters.endDate}
                    onChange={(date) => handleFilterChange('endDate', date)}
                    slotProps={{ textField: { fullWidth: true } }}
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
            ) : textView ? (
              <Box 
                sx={{ 
                  height: '500px', 
                  border: `1px solid ${theme.palette.divider}`, 
                  borderRadius: 1,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                <Editor
                  height="500px"
                  language="logs"
                  value={getPlainTextLogs()}
                  options={editorOptions}
                  theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
                  onMount={handleEditorDidMount}
                  loading={<EditorLoading />}
                />
              </Box>
            ) : (
              <Box sx={{ 
                maxHeight: '500px', 
                overflowY: 'auto',
                transition: 'all 0.3s ease'
              }}>
                {logs.map((log) => (
                  <LogEntry key={log.id} log={log} />
                ))}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Logs;
