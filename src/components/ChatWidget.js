import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  IconButton,
  Paper,
} from '@mui/material';
import { Minimize as MinimizeIcon, OpenInFull as OpenInFullIcon, Send as SendIcon } from '@mui/icons-material';
import { Resizable } from 'react-resizable';
import Draggable from 'react-draggable';
import axios from 'axios';

import 'react-resizable/css/styles.css';

/**
 * ChatWidget component that provides a floating, resizable, draggable chat interface
 * for interacting with local LLM servers (LM Studio and Ollama)
 */
const ChatWidget = () => {
  const nodeRef = useRef(null);
  const [server, setServer] = useState('lmstudio');
  const [model, setModel] = useState('');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [lmStudioAddress, setLmStudioAddress] = useState('');
  const [ollamaAddress, setOllamaAddress] = useState('');
  const [models, setModels] = useState([]);
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(400);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Store last position before collapse to restore it when expanding
  const [expandedPosition, setExpandedPosition] = useState({ x: 0, y: 0 });
  // Store last dimensions before collapse to restore when expanding
  const [expandedDimensions, setExpandedDimensions] = useState({ width: 300, height: 400 });

  useEffect(() => {
    // Initialize position to bottom right
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    setPosition({ 
      x: viewportWidth - width - 20, 
      y: viewportHeight - height - 20 
    });
    setExpandedPosition({ 
      x: viewportWidth - width - 20, 
      y: viewportHeight - height - 20 
    });

    const storedLmStudioAddress = localStorage.getItem('lmStudioAddress') || '';
    const storedOllamaAddress = localStorage.getItem('ollamaAddress') || '';
    const storedDefaultLmStudioModel = localStorage.getItem('defaultLmStudioModel') || '';
    const storedDefaultOllamaModel = localStorage.getItem('defaultOllamaModel') || '';
    setLmStudioAddress(storedLmStudioAddress);
    setOllamaAddress(storedOllamaAddress);

    // Set default model based on selected server
    if (server === 'lmstudio') {
      setModel(storedDefaultLmStudioModel);
    } else if (server === 'ollama') {
      setModel(storedDefaultOllamaModel);
    }

    // Fetch models directly from APIs
    const fetchModels = async () => {
      try {
        let response;
        let url = '';
        
        if (server === 'lmstudio' && lmStudioAddress) {
          url = `${lmStudioAddress}/v1/models`;
          try {
            console.log(`Attempting to fetch LM Studio models from ${url}`);
            response = await axios.get(url, {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 2000 // 2 second timeout
            });
            if (response.data && response.data.data && Array.isArray(response.data.data)) {
              setModels(response.data.data.map((model) => model.id));
            } else {
              console.error(
                'Error: LM Studio /v1/models response is not in the expected format',
                response.data
              );
              setModels([]);
            }
          } catch (error) {
            console.error('Error fetching LM Studio models:', error);
            console.error('Full error object:', error);
            // Don't clear models if it's just a connection error - keep any previously loaded models
            if (models.length === 0) {
              // Only set default models if we don't have any
              setModels([]);
            }
          }
        } else if (server === 'ollama' && ollamaAddress) {
          url = `${ollamaAddress}/api/tags`;
          try {
            console.log(`Attempting to fetch Ollama models from ${url}`);
            response = await axios.get(url, {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 2000 // 2 second timeout
            });
            if (response.data && Array.isArray(response.data.models)) {
              setModels(response.data.models.map((model) => model.name));
            } else {
              console.error(
                'Error: Ollama /api/tags response is not in the expected format',
                response.data
              );
              setModels([]);
            }
          } catch (error) {
            console.error('Error fetching Ollama models:', error);
            console.error('Full error object:', error);
            // Don't clear models if it's just a connection error - keep any previously loaded models
            if (models.length === 0) {
              // Only set default models if we don't have any
              setModels([]);
            }
          }
        }
      } catch (error) {
        console.error('Error in fetchModels outer try/catch:', error);
        // Keep any existing models
      }
    };

    fetchModels();
  }, [lmStudioAddress, ollamaAddress, server]);

  const handleServerChange = (event) => {
    setServer(event.target.value);
  };

  const handleModelChange = (event) => {
    setModel(event.target.value);
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    // Always add the user message to the conversation
    setConversation([
      ...conversation,
      { role: 'user', content: message }
    ]);
    
    try {
      let response;
      let url = '';
      
      if (server === 'lmstudio') {
        url = `${lmStudioAddress}/v1/chat/completions`;
        console.log(`Sending message to LM Studio at ${url}`);
        response = await axios.post(url, {
          model: model,
          messages: [{ role: 'user', content: message }],
          stream: false
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        });
      } else if (server === 'ollama') {
        url = `${ollamaAddress}/api/generate`;
        console.log(`Sending message to Ollama at ${url}`);
        response = await axios.post(url, {
          model: model,
          prompt: message,
          stream: false
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        });
      }

      const responseText = server === 'lmstudio'
        ? response.data.choices[0].message.content
        : response.data.response;

      // Update conversation with the assistant's response
      setConversation(prev => [
        ...prev,
        { role: 'assistant', content: responseText }
      ]);
      
      // Clear the message input
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add an error message to the conversation
      let errorMessage = 'Failed to get a response.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. The server may be busy or not responding.';
      } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        errorMessage = `Cannot connect to ${server} service. Please ensure it is running.`;
      }
      
      setConversation(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${errorMessage}` }
      ]);
    }
  };

  const handleResize = (event, { size }) => {
    // Update current dimensions
    setWidth(size.width);
    setHeight(size.height);
    
    // Also save for restoring after un-minimizing
    setExpandedDimensions({
      width: size.width,
      height: size.height
    });
  };

  const handleDrag = (e, ui) => {
    const { x, y } = ui;
    setPosition({ x, y });
    
    if (!isCollapsed) {
      // Save position for restoring after un-minimizing
      setExpandedPosition({ x, y });
    }
  };

  const handleCollapse = () => {
    if (!isCollapsed) {
      // If we're about to collapse, save current dimensions and position
      setExpandedDimensions({ width, height });
      setExpandedPosition({ ...position });
      
      // Collapse to just the header
      setHeight(40);
    } else {
      // Restore previous dimensions and position
      setWidth(expandedDimensions.width);
      setHeight(expandedDimensions.height);
      setPosition(expandedPosition);
    }
    
    setIsCollapsed(!isCollapsed);
  };

  return (
    <Draggable 
      handle=".chat-header" 
      nodeRef={nodeRef}
      position={position}
      onDrag={handleDrag}
    >
      <div ref={nodeRef} style={{ position: 'fixed', zIndex: 1000 }}>
        <Resizable
          width={width}
          height={height}
          onResize={handleResize}
          resizeHandles={isCollapsed ? [] : ['se']}
          handle={
            <div 
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 20,
                height: 20,
                cursor: 'se-resize'
              }}
            >
              {!isCollapsed && (
                <div 
                  style={{
                    width: 0,
                    height: 0,
                    borderStyle: 'solid',
                    borderWidth: '0 0 10px 10px',
                    borderColor: 'transparent transparent #ccc transparent',
                    position: 'absolute',
                    right: 5,
                    bottom: 5
                  }}
                />
              )}
            </div>
          }
        >
          <Paper
            elevation={3}
            sx={{
              width: width,
              height: height,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
              overflow: 'hidden',
              borderRadius: 1,
            }}
          >
            <Box 
              className="chat-header" 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 1,
                backgroundColor: 'primary.main',
                color: 'white',
                cursor: 'move',
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">Chat Assistant</Typography>
              <IconButton onClick={handleCollapse} size="small" sx={{ color: 'white' }}>
                {isCollapsed ? <OpenInFullIcon /> : <MinimizeIcon />}
              </IconButton>
            </Box>
            
            {!isCollapsed && (
              <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1, flex: 1, overflowY: 'hidden' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel id="server-label">Server</InputLabel>
                    <Select labelId="server-label" id="server" value={server} label="Server" onChange={handleServerChange}>
                      <MenuItem value="lmstudio">LM Studio</MenuItem>
                      <MenuItem value="ollama">Ollama</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ flex: 2 }}>
                    <InputLabel id="model-label">Model</InputLabel>
                    <Select labelId="model-label" id="model" value={model} label="Model" onChange={handleModelChange}>
                      {models.map((model) => (
                        <MenuItem key={model} value={model}>
                          {model}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ 
                  overflowY: 'auto', 
                  flex: 1,
                  p: 1,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1
                }}>
                  {conversation.map((msg, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        backgroundColor: msg.role === 'user' ? 'primary.light' : 'white',
                        color: msg.role === 'user' ? 'white' : 'text.primary',
                        p: 1,
                        borderRadius: 1,
                        maxWidth: '80%',
                        mb: 1,
                        wordBreak: 'break-word',
                        marginLeft: msg.role === 'user' ? 'auto' : '0'
                      }}
                    >
                      <Typography variant="body2">
                        {msg.content}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField 
                    label="Message" 
                    size="small"
                    fullWidth
                    value={message} 
                    onChange={handleMessageChange}
                    onKeyPress={handleKeyPress}
                  />
                  <Button 
                    variant="contained" 
                    onClick={handleSendMessage}
                    disabled={!message.trim() || !model}
                  >
                    <SendIcon />
                  </Button>
                </Box>
              </Box>
            )}
          </Paper>
        </Resizable>
      </div>
    </Draggable>
  );
};

export default ChatWidget;
