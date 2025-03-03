import React, { useState } from 'react';
import { 
  Box, Button, TextField, FormControl, InputLabel, Select, 
  MenuItem, Card, CardContent, Typography, Alert, CircularProgress
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { updatePreference } from '../../store/actions/systemActions';
import ModelDetector from './ModelDetector';
import LmStudioEndpointFinder from '../../utils/LmStudioEndpointFinder';

/**
 * LM Studio settings component with connection diagnostics
 */
const LmStudioSettings = () => {
  const dispatch = useDispatch();
  const settings = useSelector(state => state.settings?.lmStudio || {});
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [runningDiagnosis, setRunningDiagnosis] = useState(false);
  
  // Run LM Studio connection diagnostics
  const runDiagnostics = async () => {
    setRunningDiagnosis(true);
    setDiagnosisResult(null);
    
    try {
      const apiUrl = settings.apiUrl || 'http://localhost:1234';
      const baseUrl = apiUrl.startsWith('http') ? apiUrl : `http://${apiUrl}`;
      
      // First check if models endpoint works
      try {
        const modelsResponse = await fetch(`${baseUrl}/v1/models`);
        
        if (modelsResponse.ok) {
          const modelsData = await modelsResponse.json();
          const modelCount = modelsData?.data?.length || 0;
          
          // Now check endpoints
          const endpointResult = await LmStudioEndpointFinder.findWorkingEndpoint(baseUrl);
          
          setDiagnosisResult({
            success: endpointResult.success,
            message: `Server connection: OK (${modelCount} models available)
Working endpoint: ${endpointResult.success ? endpointResult.endpoint : 'None found'}`,
            details: endpointResult
          });
        } else {
          setDiagnosisResult({
            success: false,
            message: `Server responded with status ${modelsResponse.status}
Make sure LM Studio is running and the API server is enabled (OpenAI compatible server in LM Studio settings)`,
            error: await modelsResponse.text()
          });
        }
      } catch (error) {
        setDiagnosisResult({
          success: false,
          message: `Failed to connect to LM Studio at ${baseUrl}
Make sure LM Studio is running and the API server is enabled (OpenAI compatible server in LM Studio settings)`,
          error: error.message
        });
      }
    } catch (error) {
      setDiagnosisResult({
        success: false,
        message: `Error running diagnostics: ${error.message}`,
        error: error
      });
    } finally {
      setRunningDiagnosis(false);
    }
  };
  
  // Handle API URL change
  const handleApiUrlChange = (e) => {
    dispatch(updatePreference('lmStudio.apiUrl', e.target.value));
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>LM Studio</Typography>
        <TextField
          fullWidth
          label="API URL"
          margin="normal"
          value={settings.apiUrl || "http://localhost:1234"}
          onChange={handleApiUrlChange}
          sx={{ mb: 2 }}
          helperText="Default is http://localhost:1234"
        />
        
        <ModelDetector
          serverType="lmStudio"
          apiUrl={settings.apiUrl}
          defaultModel={settings.defaultModel}
          onModelSelected={(model) => dispatch(updatePreference('lmStudio.defaultModel', model))}
        />
        
        <Box sx={{ mt: 2 }}>
          <Button 
            variant="outlined" 
            onClick={runDiagnostics}
            disabled={runningDiagnosis}
            sx={{ mr: 1 }}
          >
            {runningDiagnosis ? <CircularProgress size={24} /> : 'Run Diagnostics'}
          </Button>
          
          {diagnosisResult && (
            <Alert 
              severity={diagnosisResult.success ? 'success' : 'error'}
              sx={{ mt: 2 }}
            >
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {diagnosisResult.message}
              </pre>
            </Alert>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default LmStudioSettings;
