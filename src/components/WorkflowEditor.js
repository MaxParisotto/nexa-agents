import React, { useState, useCallback, useEffect } from 'react';
import { Typography, Box, Button, Divider, Paper, Chip, IconButton, Card, CardContent, Grid } from '@mui/material';
import {
  ReactFlow,
  Controls,
  Background,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  MiniMap,
} from 'reactflow';
import { Save as SaveIcon, PlayArrow as RunIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { addNotification, saveWorkflowThunk, listWorkflowsThunk } from '../store/actions/systemActions';
import { fetchAgents } from '../store/actions/agentActions';

import 'reactflow/dist/style.css';
import NodeConfigurationWizard from './NodeConfigurationWizard';
import { nodeTypes } from './Agents/CustomNodes';
import WorkflowList from './Agents/WorkflowList';

// Define initial nodes and edges
const initialNodes = [];
const initialEdges = [];

/**
 * Agents component for managing and connecting different AI agent nodes in a flow
 */
const WorkflowEditor = () => {
  const dispatch = useDispatch();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isNodeConfigurationOpen, setIsNodeConfigurationOpen] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [lmStudioAddress, setLmStudioAddress] = useState('');
  const [ollamaAddress, setOllamaAddress] = useState('');
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [currentWorkflow, setCurrentWorkflow] = useState({
    id: `workflow-${Date.now()}`,
    name: 'New Workflow',
    description: '',
    nodes: [],
    edges: [],
    created: new Date().toISOString(),
    modified: new Date().toISOString()
  });
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Load settings from localStorage
  useEffect(() => {
    // Initialize core agents including Project Manager
    dispatch(fetchAgents());
    
    const storedLmStudioAddress = localStorage.getItem('lmStudioAddress') || '';
    const storedOllamaAddress = localStorage.getItem('ollamaAddress') || '';
    setLmStudioAddress(storedLmStudioAddress);
    setOllamaAddress(storedOllamaAddress);
    
    // Check if we should focus on a specific workflow (from ProjectManager)
    const focusWorkflowId = sessionStorage.getItem('focusWorkflowId');
    
    // Load workflows to find the focused one if applicable
    dispatch(listWorkflowsThunk()).then(workflowList => {
      if (focusWorkflowId) {
        // Find the workflow to focus on
        const workflowToFocus = workflowList.find(wf => wf.id === focusWorkflowId);
        
        if (workflowToFocus) {
          // Load the focused workflow
          setCurrentWorkflow(workflowToFocus);
          setNodes(workflowToFocus.nodes || []);
          setEdges(workflowToFocus.edges || []);
          
          dispatch(addNotification({
            type: 'info',
            message: `Loaded workflow "${workflowToFocus.name}"`
          }));
          
          // Clear the focus ID so it doesn't persist on page refresh
          sessionStorage.removeItem('focusWorkflowId');
        }
      } else {
        // Try to load last workflow from localStorage if no focus workflow
        const savedWorkflow = localStorage.getItem('lastWorkflow');
        if (savedWorkflow) {
          try {
            const workflow = JSON.parse(savedWorkflow);
            setNodes(workflow.nodes || []);
            setEdges(workflow.edges || []);
            setCurrentWorkflow({
              ...workflow,
              modified: new Date().toISOString()
            });
            
            dispatch(addNotification({
              type: 'info',
              message: 'Previous workflow loaded successfully.'
            }));
          } catch (error) {
            console.error('Error loading workflow:', error);
          }
        }
      }
    });
  }, [dispatch]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  
  const onNodeSelectionChange = useCallback((selectionChange) => {
    // ReactFlow's onSelectionChange provides an object with nodes and edges arrays
    if (selectionChange && Array.isArray(selectionChange.nodes)) {
      setSelectedNodes(selectionChange.nodes.map(node => node.id));
    } else {
      setSelectedNodes([]);
    }
  }, []);

  const handleAddNodeClick = () => {
    setEditingNode(null);
    setIsNodeConfigurationOpen(true);
  };

  const handleNodeConfigurationClose = () => {
    setIsNodeConfigurationOpen(false);
    setEditingNode(null);
  };

  const handleNodeAdd = (newNode) => {
    if (!newNode.data.onEdit) {
      newNode.data.onEdit = handleEditNode;
    }
    if (!newNode.data.onDelete) {
      newNode.data.onDelete = handleDeleteNode;
    }
    
    // Add the node to a reasonable position
    if (reactFlowInstance) {
      const center = reactFlowInstance.getViewport();
      newNode.position = {
        x: center.x + Math.random() * 100,
        y: center.y + Math.random() * 100
      };
    }
    
    setNodes((nds) => nds.concat(newNode));
    
    // Mark workflow as modified
    setCurrentWorkflow(prev => ({
      ...prev,
      modified: new Date().toISOString()
    }));
  };

  const handleEditNode = (nodeId) => {
    const nodeToEdit = nodes.find(node => node.id === nodeId);
    if (nodeToEdit) {
      setEditingNode(nodeToEdit);
      setIsNodeConfigurationOpen(true);
    }
  };

  const handleUpdateNode = (updatedNode) => {
    // Make sure we preserve the callbacks
    if (!updatedNode.data.onEdit) {
      updatedNode.data.onEdit = handleEditNode;
    }
    if (!updatedNode.data.onDelete) {
      updatedNode.data.onDelete = handleDeleteNode;
    }
    
    setNodes(nds => 
      nds.map(node => 
        node.id === updatedNode.id ? updatedNode : node
      )
    );
    
    // Mark workflow as modified
    setCurrentWorkflow(prev => ({
      ...prev,
      modified: new Date().toISOString()
    }));
  };

  const handleDeleteNode = (nodeId) => {
    // Remove the node
    setNodes(nds => nds.filter(node => node.id !== nodeId));
    
    // Remove any edges connected to this node
    setEdges(eds => eds.filter(
      edge => edge.source !== nodeId && edge.target !== nodeId
    ));
    
    // Mark workflow as modified
    setCurrentWorkflow(prev => ({
      ...prev,
      modified: new Date().toISOString()
    }));
  };

  const handleDeleteSelected = () => {
    if (selectedNodes.length === 0) return;
    
    // Remove selected nodes
    setNodes(nds => nds.filter(node => !selectedNodes.includes(node.id)));
    
    // Remove edges connected to selected nodes
    setEdges(eds => eds.filter(
      edge => !selectedNodes.includes(edge.source) && !selectedNodes.includes(edge.target)
    ));
    
    // Clear selection
    setSelectedNodes([]);
    
    // Mark workflow as modified
    setCurrentWorkflow(prev => ({
      ...prev,
      modified: new Date().toISOString()
    }));
  };

  const handleSaveWorkflow = () => {
    const workflow = {
      ...currentWorkflow,
      nodes,
      edges,
      modified: new Date().toISOString()
    };
    
    // Save to localStorage for quick recovery
    localStorage.setItem('lastWorkflow', JSON.stringify(workflow));
    
    // Save to redux/persistent storage
    dispatch(saveWorkflowThunk(workflow));
    
    dispatch(addNotification({
      type: 'success',
      message: 'Workflow saved successfully.'
    }));
  };

  const handleRunWorkflow = () => {
    // This would be implemented to actually execute the workflow
    // For now, just show a notification
    dispatch(addNotification({
      type: 'info',
      message: 'Workflow execution not implemented yet.'
    }));
  };

  const handleWorkflowSelect = (workflow) => {
    // Check if there are unsaved changes
    const hasUnsavedChanges = nodes.length > 0 || edges.length > 0;
    
    if (hasUnsavedChanges) {
      // In a real app, you'd confirm with the user
      const confirmChange = window.confirm("You have unsaved changes. Load the selected workflow anyway?");
      if (!confirmChange) return;
    }
    
    // Load the selected workflow
    setCurrentWorkflow(workflow);
    setNodes(workflow.nodes || []);
    setEdges(workflow.edges || []);
    
    dispatch(addNotification({
      type: 'info',
      message: `Workflow "${workflow.name}" loaded.`
    }));
  };

  const getNodeStats = () => {
    const stats = {
      agents: nodes.filter(node => node.type === 'agent').length,
      prompts: nodes.filter(node => node.type === 'prompt').length,
      outputs: nodes.filter(node => node.type === 'output').length,
      connections: edges.length
    };
    return stats;
  };

  const nodeStats = getNodeStats();

  return (
    <Box sx={{ flexGrow: 1, p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Agent Workflow Editor
        </Typography>
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<SaveIcon />}
            onClick={handleSaveWorkflow}
            sx={{ mr: 1 }}
          >
            Save
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<RunIcon />}
            onClick={handleRunWorkflow}
          >
            Run Workflow
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={2} sx={{ flexGrow: 1 }}>
        <Grid item xs={12} md={3}>
          <WorkflowList 
            onWorkflowSelect={handleWorkflowSelect}
            currentWorkflowId={currentWorkflow.id}
          />
        </Grid>
        
        <Grid item xs={12} md={9} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6">{currentWorkflow.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              {currentWorkflow.description || 'No description provided'}
            </Typography>
            
            <Divider sx={{ my: 1 }} />
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Chip label={`Agents: ${nodeStats.agents}`} color="primary" />
              <Chip label={`Prompts: ${nodeStats.prompts}`} color="info" />
              <Chip label={`Outputs: ${nodeStats.outputs}`} color="success" />
              <Chip label={`Connections: ${nodeStats.connections}`} color="secondary" />
            </Box>
          </Paper>
          
          <Paper sx={{ flexGrow: 1, minHeight: '500px', height: 'calc(100vh - 300px)' }}>
            <ReactFlowProvider>
              <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onSelectionChange={onNodeSelectionChange}
                  nodeTypes={nodeTypes}
                  fitView
                  attributionPosition="bottom-right"
                  onInit={setReactFlowInstance}
                >
                  <Background />
                  <Controls />
                  <MiniMap 
                    nodeColor={(node) => {
                      switch (node.type) {
                        case 'agent': return '#1976d2';
                        case 'prompt': return '#2196f3';
                        case 'output': return '#4caf50';
                        default: return '#ccc';
                      }
                    }}
                  />
                  
                  <Panel position="top-right">
                    <Card sx={{ mb: 2 }}>
                      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddNodeClick}
                            size="small"
                          >
                            Add Node
                          </Button>
                          
                          {selectedNodes.length > 0 && (
                            <Button
                              variant="outlined"
                              color="error"
                              startIcon={<DeleteIcon />}
                              onClick={handleDeleteSelected}
                              size="small"
                            >
                              Delete Selected
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Panel>
                </ReactFlow>
              </Box>
            </ReactFlowProvider>
          </Paper>
        </Grid>
      </Grid>

      <NodeConfigurationWizard
        open={isNodeConfigurationOpen}
        onClose={handleNodeConfigurationClose}
        onNodeAdd={handleNodeAdd}
        onNodeUpdate={handleUpdateNode}
        lmStudioAddress={lmStudioAddress}
        ollamaAddress={ollamaAddress}
        existingNodeData={editingNode}
      />
    </Box>
  );
};

export default WorkflowEditor;
