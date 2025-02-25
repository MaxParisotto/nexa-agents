import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  Divider,
  Box,
  Slider,
  FormHelperText,
  Autocomplete,
  Chip,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Description as DescriptionIcon,
  Output as OutputIcon,
  HelpOutline as HelpIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import store from '../store';
import { addNotification } from '../store/actions/systemActions';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * NodeConfigurationWizard component for configuring different types of nodes in the flow
 */
const NodeConfigurationWizard = ({ 
  open, 
  onClose, 
  onNodeAdd, 
  lmStudioAddress, 
  ollamaAddress, 
  existingNodeData = null,
  onNodeUpdate = null
}) => {
  // Basic node properties
  const [nodeType, setNodeType] = useState(existingNodeData?.type || 'agent');
  const [nodeName, setNodeName] = useState(existingNodeData?.data?.label || '');
  
  // Agent specific properties
  const [agentDescription, setAgentDescription] = useState(existingNodeData?.data?.agentDescription || '');
  const [apiAddress, setApiAddress] = useState(existingNodeData?.data?.apiAddress || lmStudioAddress || ollamaAddress || '');
  const [modelTemperature, setModelTemperature] = useState(existingNodeData?.data?.modelTemperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(existingNodeData?.data?.maxTokens || 1024);
  const [topP, setTopP] = useState(existingNodeData?.data?.topP || 0.9);
  const [repetitionPenalty, setRepetitionPenalty] = useState(existingNodeData?.data?.repetitionPenalty || 1.1);
  const [inferenceApi, setInferenceApi] = useState(existingNodeData?.data?.inferenceApi || 'lmstudio');
  const [selectedModel, setSelectedModel] = useState(existingNodeData?.data?.selectedModel || '');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
  // Prompt specific properties
  const [promptContent, setPromptContent] = useState(existingNodeData?.data?.promptContent || '');
  const [promptVariables, setPromptVariables] = useState(existingNodeData?.data?.promptVariables || []);
  const [newVariable, setNewVariable] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(existingNodeData?.data?.systemPrompt || '');
  
  // Output specific properties
  const [outputType, setOutputType] = useState(existingNodeData?.data?.outputType || 'ui');
  const [outputConfig, setOutputConfig] = useState(existingNodeData?.data?.outputConfig || '');
  const [saveToFile, setSaveToFile] = useState(existingNodeData?.data?.saveToFile || false);
  const [outputFilePath, setOutputFilePath] = useState(existingNodeData?.data?.outputFilePath || '');
  
  // UI state
  const [activeTab, setActiveTab] = useState(0);
  const [isEditMode] = useState(!!existingNodeData);

  // Validation
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (inferenceApi && apiAddress) {
      fetchAvailableModels();
    }
  }, [inferenceApi, apiAddress]);

  const fetchAvailableModels = async () => {
    setIsLoadingModels(true);
    try {
      let url = '';
      
      if (inferenceApi === 'lmstudio') {
        url = `${apiAddress}/v1/models`;
      } else if (inferenceApi === 'ollama') {
        url = `${apiAddress}/api/tags`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 3000
      });
      
      if (inferenceApi === 'lmstudio' && response.data?.data) {
        setAvailableModels(response.data.data.map(model => model.id));
      } else if (inferenceApi === 'ollama' && response.data?.models) {
        setAvailableModels(response.data.models.map(model => model.name));
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      store.dispatch(addNotification({
        type: 'error',
        message: `Failed to fetch models from ${inferenceApi}. Please check your API address.`
      }));
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleNodeTypeChange = (event) => {
    setNodeType(event.target.value);
    // Reset tab when changing node type
    setActiveTab(0);
    setErrors({});
  };

  const handleAddVariable = () => {
    if (newVariable && !promptVariables.includes(newVariable)) {
      setPromptVariables([...promptVariables, newVariable]);
      setNewVariable('');
    }
  };

  const handleDeleteVariable = (variableToDelete) => {
    setPromptVariables(promptVariables.filter(variable => variable !== variableToDelete));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const validateNodeData = () => {
    // Basic validation
    if (!nodeName) {
      store.dispatch(addNotification({
        type: 'error',
        message: 'Node name is required.'
      }));
      return false;
    }
    
    // Node type specific validation
    if (nodeType === 'agent') {
      if (!isValidUrl(apiAddress)) {
        store.dispatch(addNotification({
          type: 'error',
          message: 'Invalid API Address. Please enter a valid URL.'
        }));
        return false;
      }
      
      if (!selectedModel) {
        store.dispatch(addNotification({
          type: 'warning',
          message: 'No model selected. The agent may not function properly.'
        }));
      }
    } else if (nodeType === 'prompt') {
      if (!promptContent) {
        store.dispatch(addNotification({
          type: 'warning',
          message: 'Prompt content is empty. Please provide a prompt template.'
        }));
      }
    } else if (nodeType === 'output') {
      if (saveToFile && !outputFilePath) {
        store.dispatch(addNotification({
          type: 'error',
          message: 'Output file path is required when saving to file.'
        }));
        return false;
      }
    }
    
    return true;
  };

  const handleSaveNode = () => {
    if (!validateNodeData()) {
      return;
    }

    const nodeData = {
      id: existingNodeData?.id || uuidv4(),
      type: nodeType,
      position: existingNodeData?.position || { x: 100, y: 100 },
      data: {
        label: nodeName,
      }
    };

    // Add node type specific properties
    if (nodeType === 'agent') {
      nodeData.data = {
        ...nodeData.data,
        agentDescription,
        apiAddress,
        modelTemperature,
        maxTokens,
        topP,
        repetitionPenalty,
        inferenceApi,
        selectedModel,
      };
    } else if (nodeType === 'prompt') {
      nodeData.data = {
        ...nodeData.data,
        promptContent,
        promptVariables,
        systemPrompt,
      };
    } else if (nodeType === 'output') {
      nodeData.data = {
        ...nodeData.data,
        outputType,
        outputConfig,
        saveToFile,
        outputFilePath,
      };
    }

    if (isEditMode && onNodeUpdate) {
      onNodeUpdate(nodeData);
      store.dispatch(addNotification({
        type: 'success',
        message: `Node "${nodeName}" updated successfully.`
      }));
    } else {
      onNodeAdd(nodeData);
      store.dispatch(addNotification({
        type: 'success',
        message: `Node "${nodeName}" added successfully.`
      }));
    }
    
    onClose();
  };

  const renderAgentConfig = () => (
    <Box>
      <Tabs value={activeTab} onChange={handleTabChange} aria-label="agent configuration tabs">
        <Tab label="Basic" />
        <Tab label="Model" />
        <Tab label="Advanced" />
      </Tabs>
      
      {activeTab === 0 && (
        <Box sx={{ mt: 2 }}>
          <TextField
            label="Agent Name"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
          />
          <TextField
            label="Agent Description"
            value={agentDescription}
            onChange={(e) => setAgentDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
        </Box>
      )}
      
      {activeTab === 1 && (
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="inference-api-label">Inference API</InputLabel>
            <Select
              labelId="inference-api-label"
              id="inference-api"
              value={inferenceApi}
              label="Inference API"
              onChange={(e) => setInferenceApi(e.target.value)}
            >
              <MenuItem value="lmstudio">LM Studio</MenuItem>
              <MenuItem value="ollama">Ollama</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="API Address"
            value={apiAddress}
            onChange={(e) => setApiAddress(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
            helperText={`Default: ${inferenceApi === 'lmstudio' ? 'http://localhost:1234' : 'http://localhost:11434'}`}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <Autocomplete
              options={availableModels}
              loading={isLoadingModels}
              value={selectedModel}
              onChange={(e, newValue) => setSelectedModel(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Model"
                  required
                  helperText={isLoadingModels ? "Loading models..." : "Select a model from the list"}
                />
              )}
            />
          </FormControl>
          
          <Button variant="outlined" onClick={fetchAvailableModels} sx={{ mb: 2 }}>
            Refresh Models
          </Button>
        </Box>
      )}
      
      {activeTab === 2 && (
        <Box sx={{ mt: 2 }}>
          <Typography gutterBottom>Temperature</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Slider
              value={modelTemperature}
              onChange={(e, newValue) => setModelTemperature(newValue)}
              step={0.1}
              min={0}
              max={2}
              valueLabelDisplay="auto"
              sx={{ flexGrow: 1, mr: 2 }}
            />
            <TextField
              value={modelTemperature}
              onChange={(e) => setModelTemperature(parseFloat(e.target.value))}
              type="number"
              inputProps={{ step: 0.1, min: 0, max: 2 }}
              sx={{ width: 80 }}
            />
            <Tooltip title="Controls randomness: 0 = deterministic, 2 = very random">
              <IconButton size="small">
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Typography gutterBottom sx={{ mt: 2 }}>Max Tokens</Typography>
          <TextField
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value))}
            type="number"
            fullWidth
            inputProps={{ min: 1, step: 256 }}
            helperText="Maximum number of tokens to generate"
            sx={{ mb: 2 }}
          />
          
          <Typography gutterBottom>Top P</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Slider
              value={topP}
              onChange={(e, newValue) => setTopP(newValue)}
              step={0.05}
              min={0}
              max={1}
              valueLabelDisplay="auto"
              sx={{ flexGrow: 1, mr: 2 }}
            />
            <TextField
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              type="number"
              inputProps={{ step: 0.05, min: 0, max: 1 }}
              sx={{ width: 80 }}
            />
          </Box>
          
          <Typography gutterBottom sx={{ mt: 2 }}>Repetition Penalty</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Slider
              value={repetitionPenalty}
              onChange={(e, newValue) => setRepetitionPenalty(newValue)}
              step={0.05}
              min={1}
              max={2}
              valueLabelDisplay="auto"
              sx={{ flexGrow: 1, mr: 2 }}
            />
            <TextField
              value={repetitionPenalty}
              onChange={(e) => setRepetitionPenalty(parseFloat(e.target.value))}
              type="number"
              inputProps={{ step: 0.05, min: 1, max: 2 }}
              sx={{ width: 80 }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );

  const renderPromptConfig = () => (
    <Box>
      <Tabs value={activeTab} onChange={handleTabChange} aria-label="prompt configuration tabs">
        <Tab label="Basic" />
        <Tab label="Template" />
        <Tab label="Variables" />
      </Tabs>
      
      {activeTab === 0 && (
        <Box sx={{ mt: 2 }}>
          <TextField
            label="Prompt Name"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
          />
        </Box>
      )}
      
      {activeTab === 1 && (
        <Box sx={{ mt: 2 }}>
          <TextField
            label="System Prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{ mb: 2 }}
            helperText="System instructions for the agent (optional)"
          />
          
          <TextField
            label="Prompt Template"
            value={promptContent}
            onChange={(e) => setPromptContent(e.target.value)}
            fullWidth
            multiline
            rows={6}
            sx={{ mb: 2 }}
            required
            helperText="Use {{variable}} syntax for dynamic content"
          />
        </Box>
      )}
      
      {activeTab === 2 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Available Variables
          </Typography>
          
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              label="Add Variable"
              value={newVariable}
              onChange={(e) => setNewVariable(e.target.value)}
              sx={{ flexGrow: 1, mr: 1 }}
            />
            <Button variant="contained" onClick={handleAddVariable}>
              Add
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {promptVariables.map((variable) => (
              <Chip
                key={variable}
                label={variable}
                onDelete={() => handleDeleteVariable(variable)}
              />
            ))}
          </Box>
          
          {promptVariables.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No variables defined. Add variables to make your prompt template dynamic.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );

  const renderOutputConfig = () => (
    <Box>
      <Tabs value={activeTab} onChange={handleTabChange} aria-label="output configuration tabs">
        <Tab label="Basic" />
        <Tab label="Destination" />
      </Tabs>
      
      {activeTab === 0 && (
        <Box sx={{ mt: 2 }}>
          <TextField
            label="Output Name"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            required
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="output-type-label">Output Type</InputLabel>
            <Select
              labelId="output-type-label"
              id="output-type"
              value={outputType}
              label="Output Type"
              onChange={(e) => setOutputType(e.target.value)}
            >
              <MenuItem value="ui">UI Display</MenuItem>
              <MenuItem value="api">API Endpoint</MenuItem>
              <MenuItem value="file">File</MenuItem>
              <MenuItem value="database">Database</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}
      
      {activeTab === 1 && (
        <Box sx={{ mt: 2 }}>
          {outputType === 'api' && (
            <TextField
              label="API Endpoint"
              value={outputConfig}
              onChange={(e) => setOutputConfig(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              helperText="URL to send the output data"
            />
          )}
          
          {outputType === 'database' && (
            <TextField
              label="Database Connection String"
              value={outputConfig}
              onChange={(e) => setOutputConfig(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              helperText="Connection string for the database"
            />
          )}
          
          <FormControlLabel
            control={
              <Switch
                checked={saveToFile}
                onChange={(e) => setSaveToFile(e.target.checked)}
              />
            }
            label="Save Output to File"
          />
          
          {saveToFile && (
            <TextField
              label="Output File Path"
              value={outputFilePath}
              onChange={(e) => setOutputFilePath(e.target.value)}
              fullWidth
              sx={{ mt: 2 }}
              helperText="Path where the output will be saved"
            />
          )}
        </Box>
      )}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditMode ? "Edit Node" : "Create New Node"}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
          <Button
            variant={nodeType === 'agent' ? 'contained' : 'outlined'}
            startIcon={<MemoryIcon />}
            onClick={() => setNodeType('agent')}
          >
            Agent
          </Button>
          <Button
            variant={nodeType === 'prompt' ? 'contained' : 'outlined'}
            startIcon={<DescriptionIcon />}
            onClick={() => setNodeType('prompt')}
          >
            Prompt
          </Button>
          <Button
            variant={nodeType === 'output' ? 'contained' : 'outlined'}
            startIcon={<OutputIcon />}
            onClick={() => setNodeType('output')}
          >
            Output
          </Button>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {nodeType === 'agent' && renderAgentConfig()}
        {nodeType === 'prompt' && renderPromptConfig()}
        {nodeType === 'output' && renderOutputConfig()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSaveNode} 
          variant="contained"
          color="primary"
        >
          {isEditMode ? "Update Node" : "Create Node"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NodeConfigurationWizard;
