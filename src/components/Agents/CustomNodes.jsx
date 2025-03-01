import React, { memo } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Paper, Typography, Box, Tooltip, IconButton } from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as OutputIcon,
  Description as PromptIcon,
  Memory as AgentIcon,
  Settings as SettingsIcon,
  SettingsApplications as RoleIcon,
} from '@mui/icons-material';

// Common styles for nodes
const nodeStyles = {
  borderRadius: '8px',
  minWidth: '200px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  cursor: 'move',
};

const handleStyles = {
  base: {
    width: '12px',
    height: '12px',
    background: '#FFFFFF',
    border: '2px solid #1976d2',
  },
  input: {
    left: '-6px',
  },
  output: {
    right: '-6px',
  },
};

// Label styles
const labelStyles = {
  padding: '5px 10px',
  borderTopLeftRadius: '8px',
  borderTopRightRadius: '8px',
  color: 'white',
  fontWeight: 'bold',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

/**
 * Agent Node component - Represents an AI agent in the flow
 */
const AgentNode = ({ data, id }) => {
  const nodeFlow = useReactFlow();
  
  const handleEdit = () => {
    if (data.onEdit) {
      // Pass both node ID and whether this is the project manager
      data.onEdit(id, data.isProjectManager);
    }
  };
  
  const handleDelete = () => {
    if (data.onDelete) {
      data.onDelete(id);
    }
  };
  
  return (
    <Paper 
      sx={{
        ...nodeStyles,
        border: '2px solid #1976d2',
      }}
      className="custom-drag-handle"
    >
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{...handleStyles.base, ...handleStyles.input}}
      />
      
      {/* Title bar */}
      <Box sx={{...labelStyles, bgcolor: '#1976d2'}}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AgentIcon sx={{ mr: 1, fontSize: '16px' }} />
          <Typography variant="subtitle2">
            {data.isProjectManager ? 'Project Manager' : 'Agent'}
          </Typography>
        </Box>
        <Box>
          {data.isProjectManager && (
            <Tooltip title="Edit Role">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
                sx={{ color: 'white', p: 0.5, mr: 0.5 }}
                data-testid="edit-prompt-button"
              >
                <RoleIcon fontSize="small" />
                <Typography variant="caption" sx={{ ml: 0.5 }}>Edit Prompt</Typography>
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <IconButton size="small" onClick={handleEdit} sx={{ color: 'white', p: 0.5 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={handleDelete} sx={{ color: 'white', p: 0.5 }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Content */}
      <Box sx={{ p: 1, bgcolor: 'white' }}>
        <Typography variant="body1" fontWeight="bold">
          {data.label || 'Unnamed Agent'}
        </Typography>
        
        {data.description && (
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
            {data.description}
          </Typography>
        )}
        
        {data.modelName && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <SettingsIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary', fontSize: '14px' }} />
            <Typography variant="caption" color="text.secondary">
              {data.modelName}
            </Typography>
          </Box>
        )}
        
        {data.temperature !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Temp: {data.temperature}
            </Typography>
          </Box>
        )}
        {data.isProjectManager && data.systemPrompt && (
          <Box sx={{ mt: 1, p: 1, bgcolor: '#fffde7', borderRadius: '4px' }}>
            <Typography variant="caption" color="text.secondary">
              System Prompt: {data.systemPrompt.substring(0, 40)}{data.systemPrompt.length > 40 ? '...' : ''}
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{...handleStyles.base, ...handleStyles.output}}
      />
    </Paper>
  );
};

/**
 * Prompt Node component - Represents a prompt template in the flow
 */
const PromptNode = ({ data, id }) => {
  const nodeFlow = useReactFlow();
  
  const handleEdit = () => {
    if (data.onEdit) {
      data.onEdit(id);
    }
  };
  
  const handleDelete = () => {
    if (data.onDelete) {
      data.onDelete(id);
    }
  };
  
  return (
    <Paper 
      sx={{
        ...nodeStyles,
        border: '2px solid #2196f3',
      }}
      className="custom-drag-handle"
    >
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{...handleStyles.base, ...handleStyles.input, borderColor: '#2196f3'}}
      />
      
      {/* Title bar */}
      <Box sx={{...labelStyles, bgcolor: '#2196f3'}}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <PromptIcon sx={{ mr: 1, fontSize: '16px' }} />
          <Typography variant="subtitle2">Prompt</Typography>
        </Box>
        <Box>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={handleEdit} sx={{ color: 'white', p: 0.5 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={handleDelete} sx={{ color: 'white', p: 0.5 }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Content */}
      <Box sx={{ p: 1, bgcolor: 'white' }}>
        <Typography variant="body1" fontWeight="bold">
          {data.label || 'Unnamed Prompt'}
        </Typography>
        
        {data.content && (
          <Typography variant="caption" sx={{ 
            display: 'block', 
            color: 'text.secondary',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '180px'
          }}>
            {data.content.substring(0, 50)}{data.content.length > 50 ? '...' : ''}
          </Typography>
        )}
        
        {data.variables && data.variables.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Variables: {data.variables.join(', ')}
            </Typography>
          </Box>
        )}
      </Box>
      
      {/* Output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{...handleStyles.base, ...handleStyles.output, borderColor: '#2196f3'}}
      />
    </Paper>
  );
};

/**
 * Output Node component - Represents output processing in the flow
 */
const OutputNode = ({ data, id }) => {
  const nodeFlow = useReactFlow();
  
  const handleEdit = () => {
    if (data.onEdit) {
      data.onEdit(id);
    }
  };
  
  const handleDelete = () => {
    if (data.onDelete) {
      data.onDelete(id);
    }
  };
  
  return (
    <Paper 
      sx={{
        ...nodeStyles,
        border: '2px solid #4caf50',
      }}
      className="custom-drag-handle"
    >
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{...handleStyles.base, ...handleStyles.input, borderColor: '#4caf50'}}
      />
      
      {/* Title bar */}
      <Box sx={{...labelStyles, bgcolor: '#4caf50'}}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <OutputIcon sx={{ mr: 1, fontSize: '16px' }} />
          <Typography variant="subtitle2">Output</Typography>
        </Box>
        <Box>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={handleEdit} sx={{ color: 'white', p: 0.5 }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={handleDelete} sx={{ color: 'white', p: 0.5 }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Content */}
      <Box sx={{ p: 1, bgcolor: 'white' }}>
        <Typography variant="body1" fontWeight="bold">
          {data.label || 'Unnamed Output'}
        </Typography>
        
        {data.outputType && (
          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
            Type: {data.outputType}
          </Typography>
        )}
        
        {data.saveToFile && data.filePath && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Save to: {data.filePath}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

// Export named node types for use with ReactFlow
export const nodeTypes = {
  agent: memo(AgentNode),
  prompt: memo(PromptNode),
  output: memo(OutputNode),
};

export default nodeTypes;
