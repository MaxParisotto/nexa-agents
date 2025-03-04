import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, TextField, CircularProgress,
  Alert, Grid, Card, CardHeader, CardContent, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, LinearProgress, FormControl, InputLabel, Select, MenuItem,
  Accordion, AccordionSummary, AccordionDetails, IconButton, Slider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';

import { useSettings } from '../../contexts/SettingsContext';
import { apiService } from '../../services/api';
import realBenchmarkService from '../../utils/RealBenchmarkService';

/**
 * LLM Benchmark Component - Test and evaluate different language models
 */
export default function LlmBenchmark() {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [benchmarkConfig, setBenchmarkConfig] = useState({
    models: [],
    benchmarks: ['reasoning', 'factual', 'coding', 'creativity'],
    repetitions: 3,
    temperature: 0.7,
    saveResults: true
  });
  
  // Populate available models from settings
  useEffect(() => {
    if (settings?.llmProviders) {
      const availableModels = [];
      
      // Get models from all enabled providers
      settings.llmProviders.forEach(provider => {
        if (provider.enabled && provider.models && provider.models.length > 0) {
          provider.models.forEach(model => {
            availableModels.push({
              id: `${provider.id}:${model}`,
              label: `${model} (${provider.name})`,
              provider: provider.name,
              model: model
            });
          });
        }
      });
      
      // Set initial model selection (up to 3 models)
      const initialModels = availableModels.slice(0, 3).map(m => m.id);
      
      setBenchmarkConfig(prev => ({
        ...prev,
        models: initialModels
      }));
    }
  }, [settings?.llmProviders]);
  
  // Start benchmark test
  const handleStartBenchmark = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Make API call to run benchmarks if backend is available
      try {
        const response = await apiService.runBenchmark(benchmarkConfig);
        if (response?.data) {
          setResults(response.data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log('Backend unavailable, using local benchmark service');
      }
      
      // If API call fails, use the real local benchmark service
      console.log('Running local benchmarks with real data...');
      
      // Process selected models
      const benchmarkPromises = benchmarkConfig.models.map(async (modelId) => {
        // Parse the provider:model format
        const [providerId, modelName] = modelId.split(':');
        
        // Find the provider data
        const providerData = settings.llmProviders.find(p => p.id === providerId);
        if (!providerData) {
          return null;
        }
        
        const providerName = providerData.name;
        // Map provider type to the correct server type format expected by the benchmark service
        let serverType = providerData.type; // 'ollama' or 'lmstudio'
        if (serverType === 'lmstudio') {
          serverType = 'lmStudio'; // Fix case sensitivity issue
        }
        const apiUrl = providerData.baseUrl;
        
        // Map benchmark types to RealBenchmarkService task types
        const taskTypeMap = {
          'reasoning': 'reasoning',
          'factual': 'factual',
          'coding': 'coding',
          'creativity': 'creativity',
          'math': 'reasoning'
        };
        
        // Filter and map selected benchmarks to task types
        const taskTypes = benchmarkConfig.benchmarks
          .map(b => taskTypeMap[b] || 'completion')
          .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
        
        // Run benchmark for this model
        try {
          const benchmarkResult = await realBenchmarkService.runBenchmark({
            serverType,
            apiUrl,
            model: modelName,
            taskTypes,
            maxPrompts: benchmarkConfig.repetitions,
            temperature: benchmarkConfig.temperature,
            maxTokens: 256,
            includeFunctionCalling: benchmarkConfig.benchmarks.includes('toolCalling')
          });
          
          // Map the benchmark results to the expected format
          return {
            id: modelId,
            name: modelName,
            provider: providerName,
            results: benchmarkConfig.benchmarks.map(benchmarkType => {
              // Find corresponding task in benchmark results
              const taskType = taskTypeMap[benchmarkType] || 'factual';
              const task = benchmarkResult.tasks.find(t => t.type === taskType);
              
              if (!task) {
                return {
                  category: benchmarkType,
                  score: 0,
                  latency: 0,
                  details: {
                    accuracy: 0,
                    coherence: 0,
                    relevance: 0
                  }
                };
              }
              
              // Use the actual quality-based scores from RealBenchmarkService
              const score = task.averageScore;
              
              // Extract evaluation details from the first prompt result if available
              const promptResult = task.prompts[0] || {};
              const evaluationDetails = promptResult.evaluationDetails || {};
              
              return {
                category: benchmarkType,
                score: Math.round(score * 10) / 10,
                latency: Math.round(task.averageResponseTime),
                details: {
                  // Map evaluation details to UI components
                  accuracy: evaluationDetails.hasCorrectAnswer !== undefined 
                    ? (evaluationDetails.hasCorrectAnswer ? 100 : 0)
                    : Math.round(score * 10) / 10,
                  coherence: evaluationDetails.explanationScore !== undefined
                    ? Math.round(evaluationDetails.explanationScore * 10) / 10
                    : Math.round(score * 0.8 * 10) / 10,
                  relevance: evaluationDetails.match === 'exact' 
                    ? 100 
                    : evaluationDetails.match === 'partial' 
                      ? 80 
                      : Math.round(score * 0.9 * 10) / 10
                }
              };
            }),
            // Calculate overall score as average of all benchmark scores
            overallScore: 0 // Will be calculated after all results are mapped
          };
        } catch (err) {
          console.error(`Error benchmarking model ${modelName}:`, err);
          return null;
        }
      });
      
      // Wait for all benchmarks to complete
      const modelResults = (await Promise.all(benchmarkPromises)).filter(Boolean);
      
      // Calculate overall scores
      modelResults.forEach(model => {
        if (model && model.results && model.results.length > 0) {
          const totalScore = model.results.reduce((sum, r) => sum + r.score, 0);
          model.overallScore = Math.round((totalScore / model.results.length) * 10) / 10;
        }
      });
      
      const results = {
        timestamp: new Date().toISOString(),
        models: modelResults
      };
      
      setResults(results);
    } catch (err) {
      console.error('Error running benchmarks:', err);
      setError('Failed to run benchmarks. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle config changes
  const handleConfigChange = (field, value) => {
    setBenchmarkConfig(prev => ({ ...prev, [field]: value }));
  };
  
  // Handle model selection
  const handleModelChange = (event) => {
    const { value } = event.target;
    setBenchmarkConfig(prev => ({ ...prev, models: value }));
  };
  
  // Handle benchmark type selection
  const handleBenchmarkChange = (event) => {
    const { value } = event.target;
    setBenchmarkConfig(prev => ({ ...prev, benchmarks: value }));
  };
  
  // Get best model for a specific benchmark
  const getBestModelFor = (benchmarkType) => {
    if (!results) return null;
    
    const bestModel = results.models.reduce((best, current) => {
      const benchmarkResult = current.results.find(r => r.category === benchmarkType);
      const bestResult = best.results.find(r => r.category === benchmarkType);
      
      if (!benchmarkResult || !bestResult) return best;
      
      return benchmarkResult.score > bestResult.score ? current : best;
    }, results.models[0]);
    
    return bestModel;
  };
  
  // Download results as JSON
  const downloadResults = () => {
    if (!results) return;
    
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `llm-benchmark-${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  // Get available models for testing from settings
  const getAvailableModels = () => {
    if (!settings?.llmProviders) return [];
    
    const models = [];
    settings.llmProviders.forEach(provider => {
      if (provider.enabled && provider.models) {
        provider.models.forEach(model => {
          models.push({
            value: `${provider.id}:${model}`,
            label: `${model} (${provider.name})`
          });
        });
      }
    });
    
    return models;
  };
  
  // Available benchmark types
  const availableBenchmarks = [
    { value: 'reasoning', label: 'Logical Reasoning' },
    { value: 'factual', label: 'Factual Knowledge' },
    { value: 'coding', label: 'Code Generation' },
    { value: 'creativity', label: 'Creativity & Writing' },
    { value: 'math', label: 'Mathematical Ability' }
  ];
  
  // Color coding for scores
  const getScoreColor = (score) => {
    if (score >= 90) return 'success';
    if (score >= 75) return 'primary';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'error';
  };

  // Add this helper function near other utility functions
  const normalizeProgressValue = (value) => {
    // Convert to number and handle invalid/missing values
    const num = Number(value);
    if (isNaN(num)) return 0;
    // Clamp between 0-100
    return Math.min(Math.max(num, 0), 100);
  };

  // Get all available models for the dropdown
  const availableModels = getAvailableModels();

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>LLM Benchmark</Typography>
        <Typography variant="body1" color="textSecondary">
          Test and compare different language models across various benchmarks.
        </Typography>
      </Box>
      
      {/* Configuration Panel */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>Benchmark Configuration</Typography>
        
        {availableModels.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            No LLM models available. Please add and configure LLM providers in Settings first.
          </Alert>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="models-label">Models to Test</InputLabel>
                <Select
                  labelId="models-label"
                  multiple
                  value={benchmarkConfig.models}
                  onChange={handleModelChange}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip 
                          key={value} 
                          label={availableModels.find(m => m.value === value)?.label || value} 
                          size="small" 
                        />
                      ))}
                    </Box>
                  )}
                >
                  {availableModels.map((model) => (
                    <MenuItem key={model.value} value={model.value}>
                      {model.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="benchmarks-label">Benchmarks</InputLabel>
                <Select
                  labelId="benchmarks-label"
                  multiple
                  value={benchmarkConfig.benchmarks}
                  onChange={handleBenchmarkChange}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip 
                          key={value} 
                          label={availableBenchmarks.find(b => b.value === value)?.label || value} 
                          size="small" 
                        />
                      ))}
                    </Box>
                  )}
                >
                  {availableBenchmarks.map((benchmark) => (
                    <MenuItem key={benchmark.value} value={benchmark.value}>
                      {benchmark.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                type="number"
                label="Repetitions"
                value={benchmarkConfig.repetitions}
                onChange={(e) => handleConfigChange('repetitions', parseInt(e.target.value, 10) || 1)}
                inputProps={{ min: 1, max: 10 }}
                helperText="Number of runs per test (1-10)"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography gutterBottom>Temperature: {benchmarkConfig.temperature}</Typography>
              <Slider
                value={benchmarkConfig.temperature}
                onChange={(e, value) => handleConfigChange('temperature', value)}
                min={0}
                max={1}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 0.5, label: '0.5' },
                  { value: 1, label: '1' }
                ]}
                valueLabelDisplay="auto"
              />
            </Grid>
            
            <Grid item xs={12} md={5} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
                color="primary"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleStartBenchmark}
                disabled={loading || benchmarkConfig.models.length === 0 || benchmarkConfig.benchmarks.length === 0}
                sx={{ mr: 1 }}
              >
                {loading ? 'Running...' : 'Run Benchmark'}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={() => setResults(null)}
                disabled={loading || !results}
              >
                Reset
              </Button>
            </Grid>
          </Grid>
        )}
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}
      
      {/* Results Section */}
      {results && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">Results</Typography>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadResults}
            >
              Download JSON
            </Button>
          </Box>
          
          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {results.models.map((model) => (
              <Grid item xs={12} sm={6} md={4} key={model.id || model.name}>
                <Card>
                  <CardHeader
                    title={model.name}
                    subheader={`Provider: ${model.provider}`}
                    action={
                      <Typography 
                        variant="h5" 
                        color={`${getScoreColor(model.overallScore)}.main`}
                        sx={{ mr: 1 }}
                      >
                        {model.overallScore.toFixed(1)}
                      </Typography>
                    }
                  />
                  <CardContent>
                    {model.results.map((result) => (
                      <Box key={result.category} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2">
                            {availableBenchmarks.find(b => b.value === result.category)?.label || result.category}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color={`${getScoreColor(result.score)}.main`}
                          >
                            {result.score.toFixed(1)}
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={normalizeProgressValue(result?.score)} 
                          color={getScoreColor(result?.score)}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {/* Detailed Results Table */}
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>Detailed Results</Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Benchmark</TableCell>
                    {results.models.map((model) => (
                      <TableCell key={model.id || model.name} align="center">
                        {model.name}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {model.provider}
                        </Typography>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {benchmarkConfig.benchmarks.map((benchmarkType) => (
                    <TableRow key={benchmarkType}>
                      <TableCell component="th" scope="row">
                        {availableBenchmarks.find(b => b.value === benchmarkType)?.label || benchmarkType}
                      </TableCell>
                      
                      {results.models.map((model) => {
                        const result = model.results.find(r => r.category === benchmarkType);
                        const bestModel = getBestModelFor(benchmarkType);
                        const isBest = bestModel && (bestModel.id === model.id || bestModel.name === model.name);
                        
                        return (
                          <TableCell 
                            key={`${model.id || model.name}-${benchmarkType}`} 
                            align="center"
                            sx={{ 
                              fontWeight: isBest ? 'bold' : 'normal',
                              bgcolor: isBest ? 'action.selected' : 'transparent'
                            }}
                          >
                            <Chip 
                              label={`${result?.score.toFixed(1) || 'N/A'}`}
                              color={result ? getScoreColor(result.score) : 'default'}
                              size="small"
                              variant={isBest ? "filled" : "outlined"}
                            />
                            <Typography variant="caption" display="block" color="text.secondary">
                              {result?.latency ? `${result.latency}ms` : ''}
                            </Typography>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {/* Detailed Analysis Accordions */}
          <Typography variant="h6" gutterBottom>Detailed Analysis</Typography>
          {benchmarkConfig.benchmarks.map((benchmarkType) => (
            <Accordion key={benchmarkType} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  {availableBenchmarks.find(b => b.value === benchmarkType)?.label || benchmarkType}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {results.models.map((model) => {
                    const result = model.results.find(r => r.category === benchmarkType);
                    if (!result) return null;
                    
                    return (
                      <Grid item xs={12} md={4} key={`detail-${model.id || model.name}-${benchmarkType}`}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {model.name}
                            </Typography>
                            <Typography variant="caption" gutterBottom display="block" color="text.secondary">
                              {model.provider}
                            </Typography>
                            
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" gutterBottom>Score Components:</Typography>
                              <Table size="small">
                                <TableBody>
                                  <TableRow>
                                    <TableCell>Accuracy</TableCell>
                                    <TableCell align="right">{result.details.accuracy.toFixed(1)}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Coherence</TableCell>
                                    <TableCell align="right">{result.details.coherence.toFixed(1)}</TableCell>
                                  </TableRow>
                                  <TableRow>
                                    <TableCell>Relevance</TableCell>
                                    <TableCell align="right">{result.details.relevance.toFixed(1)}</TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </Box>
                            
                            <Divider sx={{ my: 1 }} />
                            
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                              <Typography variant="body2" color="textSecondary">Latency:</Typography>
                              <Typography variant="body2">{result.latency}ms</Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
      
      {/* Information about benchmark process */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <InfoIcon color="info" sx={{ mr: 1 }} />
          <Typography variant="h6">About Benchmarking</Typography>
        </Box>
        
        <Typography variant="body1" paragraph>
          Model benchmarking is performed by sending standardized prompts to each selected model and evaluating the responses.
          Each benchmark category tests different aspects of the model's capabilities:
        </Typography>
        
        <Grid container spacing={2}>
          {availableBenchmarks.map((benchmark) => (
            <Grid item xs={12} md={6} key={benchmark.value}>
              <Typography variant="subtitle1" gutterBottom>{benchmark.label}</Typography>
              <Typography variant="body2" color="textSecondary">
                {benchmark.value === 'reasoning' && 'Tests logical reasoning, deduction, and problem-solving skills.'}
                {benchmark.value === 'factual' && 'Evaluates factual knowledge and ability to correctly recall information.'}
                {benchmark.value === 'coding' && 'Measures quality and correctness of generated code snippets.'}
                {benchmark.value === 'creativity' && 'Assesses creative writing, storytelling, and content generation.'}
                {benchmark.value === 'math' && 'Tests mathematical problem solving and computational accuracy.'}
              </Typography>
            </Grid>
          ))}
        </Grid>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Benchmark scores range from 0-100, with higher scores indicating better performance.
            Running multiple repetitions helps ensure more reliable results by averaging across multiple attempts.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
