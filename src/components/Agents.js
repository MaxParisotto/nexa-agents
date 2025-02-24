import React, { useState, useCallback, useEffect } from 'react';
import { Typography, Box, Button } from '@mui/material';
import {
  ReactFlow,
  Controls,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
} from 'reactflow';

import 'reactflow/dist/style.css';
import NodeConfigurationWizard from './NodeConfigurationWizard';

const initialNodes = [
  {
    id: '1',
    position: { x: 0, y: 0 },
    data: { label: 'Agent Node' },
    type: 'default'
  },
];

const initialEdges = [];

const flowStyles = {
  background: '#f8f9fa',
  width: '100%',
  height: 500
};

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
    setNodes((nds) => nds.concat({
      ...newNode,
      type: 'default',
      dragHandle: '.custom-drag-handle'
    }));
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3, height: '100%', minHeight: '500px' }}>
      <Typography variant="h4" gutterBottom>
        Agents
      </Typography>
      
      <ReactFlowProvider>
        <div style={flowStyles}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            attributionPosition="bottom-right"
          >
            <Background />
            <Controls />
            <Panel position="top-right">
              <Button 
                variant="contained" 
                onClick={handleAddNodeClick}
                sx={{ mb: 2 }}
              >
                Add Node
              </Button>
            </Panel>
          </ReactFlow>
        </div>
      </ReactFlowProvider>

      <NodeConfigurationWizard
        open={isNodeConfigurationOpen}
        onClose={handleNodeConfigurationClose}
        onNodeAdd={handleNodeAdd}
        lmStudioAddress={lmStudioAddress}
        ollamaAddress={ollamaAddress}
      />
    </Box>
  );
};

export default Agents;
