import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Container,
  TextField,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { selectLLMServers, selectAvailableModels } from '../../store/reducers/settingsReducer';
import { registerAgent } from '../../store/actions/agentActions';
import AgentManager from './AgentManager';

const Agents = () => {
  const dispatch = useDispatch();
  const llmServers = useSelector(selectLLMServers);
  const availableModels = useSelector(selectAvailableModels);
  const agents = useSelector(state => state.agents.list);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    llmServer: '',
    model: '',
    prompt: '',
    functions: []
  });

  const handleCreateAgent = () => {
    const newAgent = {
      ...formData,
      id: Date.now().toString(),
      created: new Date().toISOString(),
      status: 'active',
      config: {
        llmServer: formData.llmServer,
        model: formData.model,
        prompt: formData.prompt,
        functions: formData.functions
      }
    };
    
    dispatch(registerAgent(newAgent));
    setOpenDialog(false);
    setFormData({
      name: '',
      description: '',
      llmServer: '',
      model: '',
      prompt: '',
      functions: []
    });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h4" gutterBottom>
          Agent Management
        </Typography>
        
        <Button 
          variant="contained" 
          onClick={() => setOpenDialog(true)}
          sx={{ alignSelf: 'flex-start', mb: 3 }}
        >
          Create New Agent
        </Button>

        <AgentManager />

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>Create New AI Agent</DialogTitle>
          <DialogContent dividers>
            <TextField
              fullWidth
              label="Agent Name"
              variant="outlined"
              margin="normal"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              variant="outlined"
              margin="normal"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Select
                fullWidth
                value={formData.llmServer}
                onChange={(e) => setFormData({...formData, llmServer: e.target.value})}
                displayEmpty
              >
              <MenuItem value="" disabled>Select LLM Server</MenuItem>
              {llmServers?.map((server) => (
                <MenuItem key={server.id} value={server.id}>
                  {server.name} ({server.type})
                </MenuItem>
              ))}
              </Select>
              
              <Select
                fullWidth
                value={formData.model}
                onChange={(e) => setFormData({...formData, model: e.target.value})}
                displayEmpty
              >
                <MenuItem value="" disabled>Select Model</MenuItem>
                {availableModels?.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </MenuItem>
                ))}
              </Select>
            </Box>
            
            <TextField
              fullWidth
              label="System Prompt"
              multiline
              rows={6}
              variant="outlined"
              margin="normal"
              value={formData.prompt}
              onChange={(e) => setFormData({...formData, prompt: e.target.value})}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleCreateAgent}
              disabled={!formData.name || !formData.llmServer || !formData.model}
            >
              Create Agent
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default Agents;
