import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  BarChart,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import llmBenchmarkService from '../../utils/LlmBenchmarkService';

/**
 * LLM Benchmark component for measuring model performance
 */
const LlmBenchmark = ({ onClose }) => {
  const settings = useSelector(state => state.settings);
  const [activeTab, setActiveTab] = useState(0);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  
  // Benchmark configuration
  const [config, setConfig] = useState({
    serverType: 'lmStudio',
    model: '',
    apiUrl: '',
    taskTypes: ['completion'],
    maxPrompts: 2,
    temperature: 0.7, 
    maxTokens: 256
  });

  // Add state for function calling toggle
  const [includeFunctionCalling, setIncludeFunctionCalling] = useState(true);

  // Initialize configuration from settings
  useEffect(() => {
    if (settings?.lmStudio) {
      setConfig(prev => ({
        ...prev,
        apiUrl: settings.lmStudio.apiUrl || 'http://localhost:1234',
        model: settings.lmStudio.defaultModel || ''
      }));
    }
    
    // Load benchmark history
    const savedHistory = llmBenchmarkService.getBenchmarkHistory();
    setHistory(savedHistory);
  }, [settings]);

  // Handle server type change
  const handleServerTypeChange = (event) => {
    const serverType = event.target.value;
    
    // Update server type and also update API URL and model based on selected server
    setConfig(prev => {
      const newConfig = {
        ...prev,
        serverType: serverType
      };
      
      // Set appropriate API URL and model based on server type
      if (serverType === 'lmStudio' && settings?.lmStudio) {
        newConfig.apiUrl = settings.lmStudio.apiUrl || 'http://localhost:1234';
        newConfig.model = settings.lmStudio.defaultModel || '';
      } else if (serverType === 'ollama' && settings?.ollama) {
        newConfig.apiUrl = settings.ollama.apiUrl || 'http://localhost:11434';
        newConfig.model = settings.ollama.defaultModel || '';
      }
      
      return newConfig;
    });
  };

  // Handle task type selection
  const handleTaskTypeChange = (taskType) => {
    setConfig(prev => {
      const taskTypes = [...prev.taskTypes];
      
      // Toggle the task type
      if (taskTypes.includes(taskType)) {
        // Remove the task if already selected
        return {
          ...prev,
          taskTypes: taskTypes.filter(type => type !== taskType)
        };
      } else {
        // Add the task if not selected
        return {
          ...prev,
          taskTypes: [...taskTypes, taskType]
        };
      }
    });
  };

  // Handle running the benchmark
  const handleRunBenchmark = async () => {
    try {
      setRunning(true);
      setProgress(10);
      setError(null);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 500);
      
      // Run the actual benchmark with function calling option
      const benchmarkResults = await llmBenchmarkService.runBenchmark({
        serverType: config.serverType,
        apiUrl: config.apiUrl,
        model: config.model,
        taskTypes: config.taskTypes,
        maxPrompts: config.maxPrompts,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        includeFunctionCalling // Add this option
      });
      
      // Update results
      setResults(benchmarkResults);
      
      // Update history immediately without reloading
      const updatedHistory = llmBenchmarkService.getBenchmarkHistory();
      setHistory(updatedHistory);
      
      // Clear progress interval
      clearInterval(progressInterval);
      setProgress(100);
      
      // Switch to results tab
      setActiveTab(1);
    } catch (error) {
      console.error('Benchmark error:', error);
      setError(error.message || 'Error running benchmark');
    } finally {
      setRunning(false);
    }
  };

  // Handle clearing benchmark history
  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all benchmark history?')) {
      llmBenchmarkService.clearBenchmarkHistory();
      setHistory([]);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Format a timestamp nicely
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Get available models based on server type
  const getAvailableModels = () => {
    if (config.serverType === 'lmStudio' && settings?.lmStudio?.models) {
      return settings.lmStudio.models;
    } else if (config.serverType === 'ollama' && settings?.ollama?.models) {
      return settings.ollama.models;
    }
    return [];
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AssessmentIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6">LLM Performance Benchmark</Typography>
          </Box>
          {onClose && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
        
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="Run Benchmark" />
          <Tab label="Latest Results" disabled={!results} />
          <Tab label="History" />
        </Tabs>
        
        {/* Run Benchmark Tab */}
        {activeTab === 0 && (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Server Type</InputLabel>
                  <Select
                    value={config.serverType}
                    onChange={handleServerTypeChange}
                    label="Server Type"
                    disabled={running}
                  >
                    <MenuItem value="lmStudio">LM Studio</MenuItem>
                    <MenuItem value="ollama">Ollama</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Model</InputLabel>
                  <Select
                    value={config.model}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    label="Model"
                    disabled={running}
                  >
                    {getAvailableModels().map(model => (
                      <MenuItem key={model} value={model}>{model}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>API URL</InputLabel>
                  <Select
                    value={config.apiUrl}
                    onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                    label="API URL"
                    disabled={running}
                  >
                    {config.serverType === 'lmStudio' ? (
                      <MenuItem value="http://localhost:1234">http://localhost:1234</MenuItem>
                    ) : (
                      <MenuItem value="http://localhost:11434">http://localhost:11434</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" gutterBottom>Benchmark Tasks</Typography>
                <FormGroup sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={config.taskTypes.includes('completion')}
                        onChange={() => handleTaskTypeChange('completion')}
                        disabled={running}
                      />
                    }
                    label="Text Completion"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={config.taskTypes.includes('coding')}
                        onChange={() => handleTaskTypeChange('coding')}
                        disabled={running}
                      />
                    }
                    label="Code Generation"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={config.taskTypes.includes('reasoning')}
                        onChange={() => handleTaskTypeChange('reasoning')}
                        disabled={running}
                      />
                    }
                    label="Logical Reasoning"
                  />
                </FormGroup>
                
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={includeFunctionCalling}
                      onChange={(e) => setIncludeFunctionCalling(e.target.checked)}
                      disabled={running}
                    />
                  }
                  label="Include Function Calling Tests"
                />
                
                <Typography gutterBottom>Prompts per task: {config.maxPrompts}</Typography>
                <Slider
                  value={config.maxPrompts}
                  onChange={(e, value) => setConfig({ ...config, maxPrompts: value })}
                  min={1}
                  max={3}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  disabled={running}
                  sx={{ mb: 3 }}
                />
                
                <Typography gutterBottom>Temperature: {config.temperature}</Typography>
                <Slider
                  value={config.temperature}
                  onChange={(e, value) => setConfig({ ...config, temperature: value })}
                  min={0}
                  max={1}
                  step={0.1}
                  marks
                  valueLabelDisplay="auto"
                  disabled={running}
                  sx={{ mb: 3 }}
                />
              </Grid>
              
              {error && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                </Grid>
              )}
              
              <Grid item xs={12}>
                {running ? (
                  <Box sx={{ width: '100%' }}>
                    <LinearProgress variant="determinate" value={progress} sx={{ mb: 2, height: 10, borderRadius: 1 }} />
                    <Typography variant="body2" color="text.secondary" align="center">
                      Running benchmark... {progress}%
                    </Typography>
                  </Box>
                ) : (
                  <Button 
                    variant="contained" 
                    onClick={handleRunBenchmark}
                    disabled={!config.model || config.taskTypes.length === 0}
                    startIcon={<SpeedIcon />}
                    fullWidth
                  >
                    Run Benchmark
                  </Button>
                )}
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Latest Results Tab */}
        {activeTab === 1 && results && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">
                {config.serverType === 'lmStudio' ? 'LM Studio' : 'Ollama'}: {results.model}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatTime(results.startTime)}
              </Typography>
            </Box>
            
            <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2">Avg Response Time</Typography>
                  <Typography variant="h6">{Math.round(results.averageResponseTime)} ms</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2">Tokens/Second</Typography>
                  <Typography variant="h6">{Math.round(results.tokensPerSecond * 10) / 10}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2">Total Tokens</Typography>
                  <Typography variant="h6">{results.tasks.reduce((sum, task) => sum + task.totalTokens, 0)}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="subtitle2">Total Time</Typography>
                  <Typography variant="h6">{Math.round(results.totalDuration / 100) / 10}s</Typography>
                </Grid>
              </Grid>
            </Paper>
            
            <Typography variant="subtitle1" gutterBottom>Task Results</Typography>
            
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Task</TableCell>
                    <TableCell>Prompts</TableCell>
                    <TableCell>Avg Response Time</TableCell>
                    <TableCell>Tokens/Second</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.tasks.map((task, index) => (
                    <TableRow key={index}>
                      <TableCell>{task.name}</TableCell>
                      <TableCell>{task.prompts.length}</TableCell>
                      <TableCell>{Math.round(task.averageResponseTime)} ms</TableCell>
                      <TableCell>{Math.round(task.tokensPerSecond * 10) / 10}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Add Function Calling Results if available */}
            {results.functionCallingResults && (
              <>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                  Function Calling Results
                </Typography>
                
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="subtitle2">Success Rate</Typography>
                      <Typography variant="h6">
                        {Math.round(results.functionCallingResults.successRate * 100)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="subtitle2">Accuracy</Typography>
                      <Typography variant="h6">
                        {Math.round(results.functionCallingResults.accuracy * 100)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="subtitle2">Avg Response Time</Typography>
                      <Typography variant="h6">
                        {Math.round(results.functionCallingResults.averageResponseTime)} ms
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
                
                <Typography variant="body2" gutterBottom>
                  Test Case Results:
                </Typography>
                
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Test Case</TableCell>
                        <TableCell>Expected Function</TableCell>
                        <TableCell>Actual Call</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {results.functionCallingResults.testCases.map((testCase, index) => (
                        <TableRow key={index}>
                          <TableCell>{testCase.name}</TableCell>
                          <TableCell>{testCase.expected.function}</TableCell>
                          <TableCell>
                            {testCase.actual ? testCase.actual.function.name : 'None'}
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={testCase.success ? 'Success' : 'Failed'} 
                              color={testCase.success ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
            
            <Button
              variant="outlined"
              onClick={() => setActiveTab(0)}
              startIcon={<RefreshIcon />}
            >
              Run Another Benchmark
            </Button>
          </Box>
        )}
        
        {/* History Tab */}
        {activeTab === 2 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">Benchmark History</Typography>
              <Button 
                variant="outlined" 
                color="error" 
                size="small"
                onClick={handleClearHistory}
                startIcon={<DeleteIcon />}
                disabled={history.length === 0}
              >
                Clear History
              </Button>
            </Box>
            
            {history.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No benchmark history available</Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Model</TableCell>
                      <TableCell>Server</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Response Time</TableCell>
                      <TableCell>Tokens/Sec</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.model}</TableCell>
                        <TableCell>
                          <Chip 
                            label={item.serverType} 
                            size="small" 
                            color={item.serverType === 'lmStudio' ? 'primary' : 'secondary'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{formatTime(item.startTime)}</TableCell>
                        <TableCell>{Math.round(item.averageResponseTime)} ms</TableCell>
                        <TableCell>{Math.round(item.tokensPerSecond * 10) / 10}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LlmBenchmark;
