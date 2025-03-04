import React, { useState, useEffect } from 'react';
import { 
  Box, Paper, Typography, Button, CircularProgress, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, FormControl, InputLabel, Select, MenuItem, TextField,
  Accordion, AccordionSummary, AccordionDetails, Alert
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import axios from 'axios';
import { parseModels, formatModelName, getModelScore } from '../utils/LlmModelParser';
import { addBenchmarkResult } from '../store/actions/systemActions';

const benchmarkTasks = [
  {
    id: 'basic-completion',
    name: 'Basic Completion',
    prompt: 'The capital of France is',
    expectedTokens: 5,
    description: 'Tests simple factual completion'
  },
  {
    id: 'code-generation',
    name: 'Code Generation',
    prompt: 'Write a function in Python that sorts a list of numbers in ascending order',
    expectedTokens: 50,
    description: 'Tests ability to generate programming code'
  },
  {
    id: 'reasoning',
    name: 'Logical Reasoning',
    prompt: 'If John is taller than Mike, and Mike is taller than Sarah, then',
    expectedTokens: 15,
    description: 'Tests basic logical reasoning capabilities'
  },
  {
    id: 'summarization',
    name: 'Summarization',
    prompt: 'Summarize the following in 2-3 sentences: Climate change is a long-term change in the average weather patterns that have come to define Earth\'s local, regional and global climates. These changes have a broad range of observed effects that are synonymous with the term. Changes observed in Earth\'s climate since the early 20th century are primarily driven by human activities, particularly fossil fuel burning, which increases heat-trapping greenhouse gas levels in Earth\'s atmosphere, raising Earth\'s average surface temperature.',
    expectedTokens: 50,
    description: 'Tests summarization capabilities'
  }
];

const CUSTOM_TASK_ID = 'custom';

/**
 * Component for benchmarking LLM models
 */
const LlmBenchmark = () => {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings);
  const benchmarks = useSelector(state => state.system.benchmarks || []);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('lmStudio');
  const [providerUrl, setProviderUrl] = useState('');
  const [benchmarkResults, setBenchmarkResults] = useState([]);
  const [runningTask, setRunningTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState('basic-completion');
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Get settings based on selected provider
  useEffect(() => {
    if (selectedProvider === 'lmStudio' && settings && settings.lmStudio) {
      setProviderUrl(settings.lmStudio.apiUrl || 'http://localhost:1234');
    } else if (selectedProvider === 'ollama' && settings && settings.ollama) {
      setProviderUrl(settings.ollama.apiUrl || 'http://localhost:11434');
    }
  }, [selectedProvider, settings]);
  
  // Load models for the selected provider
  useEffect(() => {
    if (providerUrl) {
      loadModels(selectedProvider, providerUrl);
    }
  }, [providerUrl, selectedProvider]);
  
  // Get historical benchmark results for the selected model
  useEffect(() => {
    if (selectedModel && benchmarks.length > 0) {
      const modelResults = benchmarks.filter(b => 
        b.model === selectedModel && b.provider === selectedProvider
      );
      setBenchmarkResults(modelResults);
    } else {
      setBenchmarkResults([]);
    }
  }, [selectedModel, selectedProvider, benchmarks]);
  
  /**
   * Load models for the selected provider
   */
  const loadModels = async (provider, apiUrl) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Format API URL
      let baseUrl = apiUrl;
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }
      baseUrl = baseUrl.replace(/\/$/, '');
      
      let models = [];
      
      if (provider === 'lmStudio') {
        const response = await axios.get(`${baseUrl}/v1/models`);
        models = parseModels(response.data.data, 'lmStudio');
      } else if (provider === 'ollama') {
        const response = await axios.get(`${baseUrl}/api/tags`);
        models = parseModels(response.data.models, 'ollama');
      }
      
      setAvailableModels(models);
      
      // Auto-select the first model if none selected
      if (models.length > 0 && !selectedModel) {
        setSelectedModel(models[0].id);
      }
    } catch (err) {
      console.error('Error loading models:', err);
      setError(`Failed to load models: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * Run a benchmark task on the selected model
   */
  const runBenchmark = async (taskId) => {
    if (!selectedModel || !providerUrl) {
      setError('Please select a model and ensure provider URL is set');
      return;
    }
    
    setRunningTask(taskId);
    setError(null);
    
    try {
      // Get the task
      const task = taskId === CUSTOM_TASK_ID
        ? { id: CUSTOM_TASK_ID, name: 'Custom Task', prompt: customPrompt }
        : benchmarkTasks.find(t => t.id === taskId);
      
      if (!task) {
        throw new Error('Task not found');
      }
      
      // Format URL
      let baseUrl = providerUrl;
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `http://${baseUrl}`;
      }
      baseUrl = baseUrl.replace(/\/$/, '');
      
      // Prepare request based on provider
      const startTime = Date.now();
      let response;
      
      if (selectedProvider === 'lmStudio') {
        response = await axios.post(
          `${baseUrl}/v1/chat/completions`,
          {
            model: selectedModel,
            messages: [{ role: 'user', content: task.prompt }],
            temperature: 0.7,
            max_tokens: 500
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
      } else if (selectedProvider === 'ollama') {
        response = await axios.post(
          `${baseUrl}/api/generate`,
          {
            model: selectedModel,
            prompt: task.prompt,
            stream: false
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Extract response text and estimate token count
      const responseText = selectedProvider === 'lmStudio' 
        ? response.data.choices[0].message.content
        : response.data.response;
      
      const tokens = estimateTokenCount(responseText);
      const tokensPerSecond = Math.round((tokens / duration) * 1000);
      
      // Create benchmark result
      const result = {
        id: `${Date.now()}`,
        timestamp: new Date().toISOString(),
        model: selectedModel,
        provider: selectedProvider,
        task: task.id,
        taskName: task.name,
        prompt: task.prompt,
        response: responseText,
        duration,
        tokens,
        tokensPerSecond
      };
      
      // Add to Redux
      dispatch(addBenchmarkResult(result));
      
      // Update local state
      setBenchmarkResults(prev => [result, ...prev]);
      
      return result;
    } catch (err) {
      console.error('Benchmark error:', err);
      setError(`Benchmark failed: ${err.message}`);
      return null;
    } finally {
      setRunningTask(null);
    }
  };
  
  /**
   * Run all benchmark tasks
   */
  const runAllBenchmarks = async () => {
    setError(null);
    
    for (const task of benchmarkTasks) {
      await runBenchmark(task.id);
    }
  };
  
  /**
   * Estimate token count based on text
   * This is a rough estimate as actual tokenization varies by model
   */
  const estimateTokenCount = (text) => {
    if (!text) return 0;
    
    // Simple approximation: 4 chars per token is a rough average for English text
    return Math.ceil(text.length / 4);
  };
  
  /**
   * Get an overall score for the model based on benchmarks
   */
  const calculateOverallScore = (results) => {
    if (!results || results.length === 0) return 0;
    
    // Calculate score based on tokens per second, normalized to a 0-100 scale
    const tpsScores = results.map(r => Math.min(100, r.tokensPerSecond / 5));
    
    // Average the scores
    const avgScore = tpsScores.reduce((sum, score) => sum + score, 0) / tpsScores.length;
    
    return Math.round(avgScore);
  };
  
  /**
   * Get selected model details
   */
  const getSelectedModelDetails = () => {
    return availableModels.find(m => m.id === selectedModel);
  };
  
  const selectedModelDetails = getSelectedModelDetails();
  
  return (
    <Paper sx={{ p: 3, mb: 3 }} elevation={2}>
      <Typography variant="h5" gutterBottom>LLM Benchmarking</Typography>
      
      {/* Provider selection */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Provider</InputLabel>
          <Select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            label="Provider"
          >
            <MenuItem value="lmStudio">LM Studio</MenuItem>
            <MenuItem value="ollama">Ollama</MenuItem>
          </Select>
        </FormControl>
        
        <TextField 
          label="Provider URL"
          value={providerUrl}
          onChange={(e) => setProviderUrl(e.target.value)}
          sx={{ flexGrow: 1 }}
        />
        
        <Button 
          variant="outlined"
          onClick={() => loadModels(selectedProvider, providerUrl)}
          disabled={isLoading}
        >
          Refresh Models
        </Button>
      </Box>
      
      {/* Model selection */}
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Select Model</InputLabel>
        <Select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          label="Select Model"
          disabled={isLoading || availableModels.length === 0}
        >
          {availableModels.map(model => (
            <MenuItem key={model.id} value={model.id}>
              {model.name} {model.size !== 'Unknown' ? `(${model.size})` : ''}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      {/* Selected model details */}
      {selectedModelDetails && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="subtitle1" gutterBottom>Selected Model Details</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            <Chip label={`Architecture: ${selectedModelDetails.architecture || 'Unknown'}`} />
            <Chip label={`Size: ${selectedModelDetails.size || 'Unknown'}`} />
            <Chip label={`Quantization: ${selectedModelDetails.quantization || 'Unknown'}`} />
            <Chip 
              label={`Context: ${selectedModelDetails.contextLength ? 
                `${selectedModelDetails.contextLength.toLocaleString()} tokens` : 'Unknown'}`} 
            />
            <Chip 
              color="primary" 
              label={`Score: ${getModelScore(selectedModelDetails)}`} 
            />
          </Box>
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}
      
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Benchmark Tasks</Typography>
      
      {/* Benchmark tasks */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Task</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {benchmarkTasks.map(task => (
              <TableRow key={task.id}>
                <TableCell>{task.name}</TableCell>
                <TableCell>{task.description}</TableCell>
                <TableCell align="right">
                  <Button 
                    variant="contained" 
                    size="small"
                    onClick={() => runBenchmark(task.id)}
                    disabled={isLoading || runningTask === task.id}
                  >
                    {runningTask === task.id ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Run'
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            
            {/* Custom task */}
            <TableRow>
              <TableCell>Custom Task</TableCell>
              <TableCell>
                <TextField
                  multiline
                  rows={2}
                  fullWidth
                  placeholder="Enter custom prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  variant="outlined"
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={() => runBenchmark(CUSTOM_TASK_ID)}
                  disabled={isLoading || runningTask === CUSTOM_TASK_ID || !customPrompt}
                >
                  {runningTask === CUSTOM_TASK_ID ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Run'
                  )}
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button 
          variant="contained" 
          color="primary"
          onClick={runAllBenchmarks}
          disabled={isLoading || !!runningTask || availableModels.length === 0}
        >
          Run All Benchmarks
        </Button>
        
        <Button 
          variant="outlined"
          onClick={() => setBenchmarkResults([])}
          disabled={benchmarkResults.length === 0}
        >
          Clear Results
        </Button>
      </Box>
      
      {/* Results */}
      {benchmarkResults.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom>Results</Typography>
          
          {/* Summary score */}
          <Paper sx={{ p: 2, mb: 3, textAlign: 'center', bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="h4">
              Overall Score: {calculateOverallScore(benchmarkResults)}
            </Typography>
            <Typography variant="body2">
              Based on {benchmarkResults.length} benchmark results
            </Typography>
          </Paper>
          
          {/* Results table */}
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Task</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Tokens</TableCell>
                  <TableCell align="right">Tokens/sec</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {benchmarkResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell>{result.taskName || result.task}</TableCell>
                    <TableCell>{result.duration}ms</TableCell>
                    <TableCell>{result.tokens}</TableCell>
                    <TableCell align="right">{result.tokensPerSecond}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Detailed results */}
          <Typography variant="subtitle1" gutterBottom>Detailed Results</Typography>
          {benchmarkResults.map((result) => (
            <Accordion key={result.id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{result.taskName || result.task} - {new Date(result.timestamp).toLocaleString()}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Prompt:</Typography>
                  <Paper variant="outlined" sx={{ p: 1, mb: 2, bgcolor: 'background.default' }}>
                    <Typography variant="body2" whiteSpace="pre-wrap">
                      {result.prompt}
                    </Typography>
                  </Paper>
                  
                  <Typography variant="subtitle2" gutterBottom>Response:</Typography>
                  <Paper variant="outlined" sx={{ p: 1, mb: 2, bgcolor: 'background.default' }}>
                    <Typography variant="body2" whiteSpace="pre-wrap">
                      {result.response}
                    </Typography>
                  </Paper>
                  
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip label={`Duration: ${result.duration}ms`} color="primary" variant="outlined" />
                    <Chip label={`Tokens: ${result.tokens}`} color="secondary" variant="outlined" />
                    <Chip label={`Tokens/sec: ${result.tokensPerSecond}`} color="success" variant="outlined" />
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}
    </Paper>
  );
};

export default LlmBenchmark;