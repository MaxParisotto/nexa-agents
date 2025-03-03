import React, { useState } from 'react';
import { 
  Typography, Button, Divider, Box, 
  Card, CardContent, Grid 
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import BuildIcon from '@mui/icons-material/Build';
import LlmBenchmark from './LlmBenchmark';
import DiagnosticResultsDialog from './DiagnosticResultsDialog';
import llmDiagnostic from '../../utils/LlmDiagnostic';
import { useSelector } from 'react-redux';

const LlmSettings = () => {
  const settings = useSelector(state => state.settings);
  // Add state for benchmark dialog
  const [showBenchmark, setShowBenchmark] = useState(false);
  
  // Add state for diagnostic dialog
  const [diagnosticDialogOpen, setDiagnosticDialogOpen] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState(null);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);
  const [diagnosticType, setDiagnosticType] = useState('lmStudio'); // 'lmStudio' or 'ollama'

  // Run LM Studio diagnostic
  const runLmStudioDiagnostic = async () => {
    setDiagnosticType('lmStudio');
    setDiagnosticResults(null);
    setRunningDiagnostic(true);
    setDiagnosticDialogOpen(true);
    
    try {
      const apiUrl = settings?.lmStudio?.apiUrl || 'http://localhost:1234';
      const model = settings?.lmStudio?.defaultModel || '';
      
      const results = await llmDiagnostic.runLmStudioDiagnostic(apiUrl, model);
      setDiagnosticResults(results);
    } catch (error) {
      console.error('Error running LM Studio diagnostic:', error);
      setDiagnosticResults({
        apiUrl: settings?.lmStudio?.apiUrl || 'http://localhost:1234',
        model: settings?.lmStudio?.defaultModel || 'unknown',
        generalStatus: 'failed',
        steps: [],
        errorDetails: {
          message: error.message,
          stack: error.stack
        }
      });
    } finally {
      setRunningDiagnostic(false);
    }
  };
  
  // Run Ollama diagnostic
  const runOllamaDiagnostic = async () => {
    setDiagnosticType('ollama');
    setDiagnosticResults(null);
    setRunningDiagnostic(true);
    setDiagnosticDialogOpen(true);
    
    try {
      const apiUrl = settings?.ollama?.apiUrl || 'http://localhost:11434';
      const model = settings?.ollama?.defaultModel || '';
      
      const results = await llmDiagnostic.runOllamaDiagnostic(apiUrl, model);
      setDiagnosticResults(results);
    } catch (error) {
      console.error('Error running Ollama diagnostic:', error);
      setDiagnosticResults({
        apiUrl: settings?.ollama?.apiUrl || 'http://localhost:11434',
        model: settings?.ollama?.defaultModel || 'unknown',
        generalStatus: 'failed',
        steps: [],
        errorDetails: {
          message: error.message,
          stack: error.stack
        }
      });
    } finally {
      setRunningDiagnostic(false);
    }
  };

  return (
    <>
      <Typography variant="h6" gutterBottom>
        LLM Provider Settings
      </Typography>
      
      {/* Add diagnostic and benchmark buttons at the top */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button 
          variant="outlined" 
          startIcon={<BuildIcon />}
          onClick={runLmStudioDiagnostic}
        >
          LM Studio Diagnostic
        </Button>
        
        <Button 
          variant="outlined" 
          startIcon={<BuildIcon />}
          onClick={runOllamaDiagnostic}
        >
          Ollama Diagnostic
        </Button>
        
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SpeedIcon />}
          onClick={() => setShowBenchmark(true)}
        >
          Run Benchmark
        </Button>
      </Box>
      
      {/* ... existing LM Studio and Ollama settings ... */}
      
      {/* Show benchmark component conditionally */}
      {showBenchmark && (
        <>
          <Divider sx={{ my: 4 }} />
          <LlmBenchmark onClose={() => setShowBenchmark(false)} />
        </>
      )}
      
      {/* Diagnostic Results Dialog */}
      <DiagnosticResultsDialog
        open={diagnosticDialogOpen}
        onClose={() => setDiagnosticDialogOpen(false)}
        results={diagnosticResults}
        running={runningDiagnostic}
      />
    </>
  );
};

export default LlmSettings;
