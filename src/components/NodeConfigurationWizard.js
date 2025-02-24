import React, { useState } from 'react';
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
} from '@mui/material';

const NodeConfigurationWizard = ({ open, onClose, onNodeAdd, lmStudioAddress, ollamaAddress }) => {
  const [nodeType, setNodeType] = useState('agent');
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [apiAddress, setApiAddress] = useState(lmStudioAddress || ollamaAddress || '');
  const [modelTemperature, setModelTemperature] = useState(1);
  const [repetitionPenalty, setRepetitionPenalty] = useState(1);
  const [inferenceApi, setInferenceApi] = useState('lmstudio');

  const handleNodeTypeChange = (event) => {
    setNodeType(event.target.value);
  };

  const handleAgentNameChange = (event) => {
    setAgentName(event.target.value);
  };

  const handleAgentDescriptionChange = (event) => {
    setAgentDescription(event.target.value);
  };

  const handleApiAddressChange = (event) => {
    setApiAddress(event.target.value);
  };

  const handleModelTemperatureChange = (event) => {
    setModelTemperature(event.target.value);
  };

  const handleRepetitionPenaltyChange = (event) => {
    setRepetitionPenalty(event.target.value);
  };

  const handleInferenceApiChange = (event) => {
    setInferenceApi(event.target.value);
  };

  const handleAddNode = () => {
    const newNode = {
      id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      position: { x: 0, y: 0 },
      data: {
        label: agentName || 'Agent Node',
        agentName,
        agentDescription,
        apiAddress,
        modelTemperature,
        repetitionPenalty,
        inferenceApi,
      },
      type: nodeType,
    };
    onNodeAdd(newNode);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Node Configuration</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="node-type-label">Node Type</InputLabel>
          <Select
            labelId="node-type-label"
            id="node-type"
            value={nodeType}
            label="Node Type"
            onChange={handleNodeTypeChange}
          >
            <MenuItem value="agent">Agent</MenuItem>
            <MenuItem value="prompt">Prompt</MenuItem>
            <MenuItem value="output">Output</MenuItem>
          </Select>
        </FormControl>
        {nodeType === 'agent' && (
          <>
            <TextField
              label="Agent Name"
              value={agentName}
              onChange={handleAgentNameChange}
              fullWidth
              sx={{ mt: 2 }}
            />
            <TextField
              label="Agent Description"
              value={agentDescription}
              onChange={handleAgentDescriptionChange}
              fullWidth
              sx={{ mt: 2 }}
            />
            <TextField
              label="API Address"
              value={apiAddress}
              onChange={handleApiAddressChange}
              fullWidth
              sx={{ mt: 2 }}
            />
            <TextField
              label="Model Temperature"
              type="number"
              value={modelTemperature}
              onChange={handleModelTemperatureChange}
              inputProps={{
                min: 0,
                max: 2,
                step: 0.1,
              }}
              fullWidth
              sx={{ mt: 2 }}
            />
            <TextField
              label="Repetition Penalty"
              type="number"
              value={repetitionPenalty}
              onChange={handleRepetitionPenaltyChange}
              inputProps={{
                min: 1,
                max: 2,
                step: 0.1,
              }}
              fullWidth
              sx={{ mt: 2 }}
            />
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="inference-api-label">Inference API</InputLabel>
              <Select
                labelId="inference-api-label"
                id="inference-api"
                value={inferenceApi}
                label="Inference API"
                onChange={handleInferenceApiChange}
              >
                <MenuItem value="lmstudio">LM Studio</MenuItem>
                <MenuItem value="ollama">Ollama</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAddNode} variant="contained">
          Add Node
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NodeConfigurationWizard;
