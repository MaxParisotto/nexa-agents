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
        if (server === 'lmstudio' && lmStudioAddress) {
          response = await axios.get(`${lmStudioAddress}/api/models`, {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
          setModels(response.data.map(model => model.id));
        } else if (server === 'ollama' && ollamaAddress) {
          response = await axios.get(`${ollamaAddress}/api/models`, {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
          setModels(response.data.models.map(model => model.name));
        }
      } catch (error) {
        console.error('Error fetching models:', error);
        setModels([]);
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
    try {
      let response;
      if (server === 'lmstudio') {
        response = await axios.post(`${lmStudioAddress}/api/chat`, {
          model: model,
          messages: [{ role: 'user', content: message }]
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } else if (server === 'ollama') {
        response = await axios.post(`${ollamaAddress}/api/generate`, {
          model: model,
          prompt: message,
          stream: false
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      const responseText = server === 'lmstudio' 
        ? response.data.choices[0].message.content
        : response.data.response;

      setConversation([
        ...conversation,
        { role: 'user', content: message },
        { role: 'assistant', content: responseText },
      ]);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
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
