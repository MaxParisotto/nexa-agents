import React, { useState, useCallback } from 'react';
import { Typography, Box, TextField, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
} from 'reactflow';

import 'reactflow/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Agent Node' } },
];

const initialEdges = [];

const Agents = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [apiAddress, setApiAddress] = useState('');
  const [modelTemperature, setModelTemperature] = useState(1);
  const [repetitionPenalty, setRepetitionPenalty] = useState(1);
  const [inferenceApi, setInferenceApi] = useState('lmstudio');

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

  return (
    <Box sx={{ flexGrow: 1, p: 3, height: '500px' }}>
      <Typography variant="h4" gutterBottom>
        Agents
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '300px' }}>
        <TextField
          label="Agent Name"
          value={agentName}
          onChange={handleAgentNameChange}
        />
        <TextField
          label="Agent Description"
          value={agentDescription}
          onChange={handleAgentDescriptionChange}
        />
        <TextField
          label="API Address"
          value={apiAddress}
          onChange={handleApiAddressChange}
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
        />
        <FormControl fullWidth>
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
      </Box>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        />
      </ReactFlowProvider>
    </Box>
  );
};

export default Agents;
