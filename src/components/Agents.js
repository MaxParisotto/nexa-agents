import React, { useState, useCallback, useEffect } from 'react';
import { Typography, Box, TextField, Select, MenuItem, InputLabel, FormControl, Button } from '@mui/material';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
} from 'reactflow';

import 'reactflow/dist/style.css';
import NodeConfigurationWizard from './NodeConfigurationWizard';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Agent Node' } },
];

const initialEdges = [];

const Agents = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isNodeConfigurationOpen, setIsNodeConfigurationOpen] = useState(false);
  const [lmStudioAddress, setLmStudioAddress] = useState('');
  const [ollamaAddress, setOllamaAddress] = useState('');

  useEffect(() => {
    const storedLmStudioAddress = localStorage.getItem('lmStudioAddress') || '';
    const storedOllamaAddress = localStorage.getItem('ollamaAddress') || '';
    setLmStudioAddress(storedLmStudioAddress);
    setOllamaAddress(storedOllamaAddress);
  }, []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleAddNodeClick = () => {
    setIsNodeConfigurationOpen(true);
  };

  const handleNodeConfigurationClose = () => {
    setIsNodeConfigurationOpen(false);
  };

  const handleNodeAdd = (newNode) => {
    setNodes((nds) => nds.concat(newNode));
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3, height: '500px' }}>
      <Typography variant="h4" gutterBottom>
        Agents
      </Typography>
      <Button variant="contained" onClick={handleAddNodeClick}>Add Node</Button>
      <NodeConfigurationWizard
        open={isNodeConfigurationOpen}
        onClose={handleNodeConfigurationClose}
        onNodeAdd={handleNodeAdd}
        lmStudioAddress={lmStudioAddress}
        ollamaAddress={ollamaAddress}
      />
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
