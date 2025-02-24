import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Minimize as MinimizeIcon, OpenInFull as OpenInFullIcon } from '@mui/icons-material';
import { Resizable } from 'react-resizable';
import Draggable from 'react-draggable';
import axios from 'axios';

import 'react-resizable/css/styles.css';

const ChatWidget = () => {
  const nodeRef = React.useRef(null);
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

  useEffect(() => {
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
    setWidth(size.width);
    setHeight(size.height);
  };

  const handleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <Draggable handle=".chat-header" nodeRef={nodeRef}>
      <div ref={nodeRef}>
        <Resizable
          width={width}
          height={height}
          onResize={handleResize}
          resizeHandles={['se']}
        >
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              right: 0,
              width: width,
              height: height,
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              padding: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              overflow: 'hidden',
              cursor: 'move',
            }}
          >
            <Box className="chat-header" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'move' }}>
              <Typography variant="h6">Chat Widget</Typography>
              <IconButton onClick={handleCollapse} size="small">
                {isCollapsed ? <OpenInFullIcon /> : <MinimizeIcon />}
              </IconButton>
            </Box>
            {!isCollapsed && (
              <>
                <FormControl fullWidth>
                  <InputLabel id="server-label">Server</InputLabel>
                  <Select labelId="server-label" id="server" value={server} label="Server" onChange={handleServerChange}>
                    <MenuItem value="lmstudio">LM Studio</MenuItem>
                    <MenuItem value="ollama">Ollama</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel id="model-label">Model</InputLabel>
                  <Select labelId="model-label" id="model" value={model} label="Model" onChange={handleModelChange}>
                    {models.map((model) => (
                      <MenuItem key={model} value={model}>
                        {model}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ overflowY: 'scroll', height: 200 }}>
                  {conversation.map((message, index) => (
                    <Box key={index} sx={{ textAlign: message.role === 'user' ? 'right' : 'left' }}>
                      <Typography variant="body2">
                        {message.role === 'user' ? 'You:' : 'Assistant:'} {message.content}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <TextField label="Message" value={message} onChange={handleMessageChange} />
                <Button variant="contained" onClick={handleSendMessage}>
                  Send
                </Button>
              </>
            )}
          </Box>
        </Resizable>
      </div>
    </Draggable>
  );
};

export default ChatWidget;
