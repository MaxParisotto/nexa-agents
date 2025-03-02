import React, { useState } from 'react';
import { 
  Typography, Button, Divider, Box, 
  Card, CardContent, Grid 
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import LlmBenchmark from './LlmBenchmark';

const LlmSettings = () => {
  // Add state for benchmark dialog
  const [showBenchmark, setShowBenchmark] = useState(false);

  // ... existing component code ...

  return (
    <>
      <Typography variant="h6" gutterBottom>
        LLM Provider Settings
      </Typography>
      
      {/* Add benchmark button at the top */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
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
    </>
  );
};

export default LlmSettings;
