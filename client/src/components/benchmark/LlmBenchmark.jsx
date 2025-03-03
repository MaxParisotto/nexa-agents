import React, { useState } from 'react';
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

/**
 * LLM Benchmark Component - Test and evaluate different language models
 */
export default function LlmBenchmark() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [benchmarkConfig, setBenchmarkConfig] = useState({
    models: ['gpt-4', 'llama2', 'mistral'],
    benchmarks: ['reasoning', 'factual', 'coding', 'creativity'],
    repetitions: 3,
    temperature: 0.7,
    saveResults: true
  });
  
  // Start benchmark test
  const handleStartBenchmark = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // This would be an actual API call to run benchmarks in a real app
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate mock results
      const mockResults = {
        timestamp: new Date().toISOString(),
        models: benchmarkConfig.models.map(model => ({
          name: model,
          results: benchmarkConfig.benchmarks.map(benchmark => ({
            category: benchmark,
            score: Math.round(Math.random() * 1000) / 10, // Random score between 0-100
            latency: Math.round(Math.random() * 2000 + 500), // Random latency between 500-2500ms
            details: {
              accuracy: Math.round(Math.random() * 1000) / 10,
              coherence: Math.round(Math.random() * 1000) / 10,
              relevance: Math.round(Math.random() * 1000) / 10,
            }
          })),
          overallScore: Math.round(Math.random() * 1000) / 10 // Random overall score
        }))
      };
      
      setResults(mockResults);
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
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `llm-benchmark-${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  // Available models for testing
  const availableModels = [
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'llama2', label: 'Llama 2' },
    { value: 'llama3', label: 'Llama 3' },
    { value: 'mistral', label: 'Mistral AI' },
    { value: 'claude-3', label: 'Claude 3' }
  ];
  
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
              <Grid item xs={12} sm={6} md={4} key={model.name}>
                <Card>
                  <CardHeader
                    title={availableModels.find(m => m.value === model.name)?.label || model.name}
                    subheader={`Overall Score: ${model.overallScore.toFixed(1)}/100`}
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
                          value={result.score} 
                          color={getScoreColor(result.score)}
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
                      <TableCell key={model.name} align="center">
                        {availableModels.find(m => m.value === model.name)?.label || model.name}
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
                        const isBest = bestModel?.name === model.name;
                        
                        return (
                          <TableCell 
                            key={`${model.name}-${benchmarkType}`} 
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
                      <Grid item xs={12} md={4} key={`detail-${model.name}-${benchmarkType}`}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              {availableModels.find(m => m.value === model.name)?.label || model.name}
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
    </Box>
  );
}
