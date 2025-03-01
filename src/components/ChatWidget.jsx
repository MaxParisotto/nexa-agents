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
  Divider,
  List,
  ListItem,
  ListItemText,
  Avatar,
} from '@mui/material';
import { Minimize as MinimizeIcon, OpenInFull as OpenInFullIcon, Send as SendIcon, Maximize as MaximizeIcon, Close as CloseIcon } from '@mui/icons-material';
import { Resizable } from 'react-resizable';
import Draggable from 'react-draggable';
import axios from 'axios';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useSelector } from 'react-redux';

import 'react-resizable/css/styles.css';

/**
 * ChatWidget component that provides a floating, resizable, draggable chat interface
 * for interacting with local LLM servers (LM Studio and Ollama)
 */
const ChatWidget = () => {
  const nodeRef = useRef(null);
  const [server, setServer] = useState('lmstudio');
  const [model, setModel] = useState('');
  const [outputTarget, setOutputTarget] = useState('chat');
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [lmStudioAddress, setLmStudioAddress] = useState('');
  const [ollamaAddress, setOllamaAddress] = useState('');
  const [models, setModels] = useState([]);
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(400);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartDimensions, setResizeStartDimensions] = useState({ width: 0, height: 0 });
  const [resizeStartPosition, setResizeStartPosition] = useState({ x: 0, y: 0 });
  const chatContainerRef = useRef(null);
  const [messageListenerAdded, setMessageListenerAdded] = useState(false);
  const settings = useSelector(state => state.settings);
  const [connectionStatus, setConnectionStatus] = useState({
    status: 'checking',
    message: 'Checking connection...'
  });

  // Store last position before collapse to restore it when expanding
  const [expandedPosition, setExpandedPosition] = useState({ x: 0, y: 0 });
  // Store last dimensions before collapse to restore when expanding
  const [expandedDimensions, setExpandedDimensions] = useState({ width: 300, height: 400 });

  useEffect(() => {
    // Setup event listener for dock toggling
    const handleDockToggle = (event) => {
      const { isOpen } = event.detail;
      setMinimized(!isOpen);
      
      // If opening from dock, position near the dock
      if (isOpen) {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Position above the dock button in the center-bottom of the screen
        setPosition({
          x: (viewportWidth / 2) - (width / 2),
          y: viewportHeight - height - 80 // Position above the dock
        });
      }
    };
    
    window.addEventListener('toggle-chat-widget', handleDockToggle);
    
    // Initialize position to bottom right
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    setPosition({ 
      x: viewportWidth - width - 20, 
      y: viewportHeight - height - 80 // Position higher to account for the dock 
    });
    setExpandedPosition({ 
      x: viewportWidth - width - 20, 
      y: viewportHeight - height - 80 
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

    return () => {
      window.removeEventListener('toggle-chat-widget', handleDockToggle);
    };
  }, [lmStudioAddress, ollamaAddress, server]); // Removed width/height from dependencies

  useEffect(() => {
    // Let ProjectManager handle the welcome message, don't add our own
    
    // Setup event listeners for project manager messages
    if (!messageListenerAdded) {
      window.addEventListener('project-manager-message', handleProjectManagerMessage);
      setMessageListenerAdded(true);
      
      console.log('Added project-manager-message event listener');
    }
    
    return () => {
      if (messageListenerAdded) {
        window.removeEventListener('project-manager-message', handleProjectManagerMessage);
        console.log('Removed project-manager-message event listener');
      }
    };
  }, [messageListenerAdded]);
  
  // Auto-scroll to bottom when chat history updates
  useEffect(() => {
    if (chatContainerRef.current && !isCollapsed) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation, isCollapsed]);
  
  // Check server connection on component mount
  useEffect(() => {
    checkLLMConnection();
    
    // Set up a periodic connection check
    const checkInterval = setInterval(checkLLMConnection, 60000); // Check every minute
    
    return () => clearInterval(checkInterval);
  }, [settings]);
  
  // Check if the LLM server is connected
  const checkLLMConnection = async () => {
    setConnectionStatus({
      status: 'checking',
      message: 'Checking connection...'
    });
    
    try {
      // Try LM Studio first
      let isLmStudioConnected = false;
      let isOllamaConnected = false;
      
      try {
        const lmStudioUrl = settings?.lmStudio?.apiUrl || 'http://localhost:1234';
        const baseUrl = lmStudioUrl.startsWith('http') ? lmStudioUrl : `http://${lmStudioUrl}`;
        await axios.get(`${baseUrl}/v1/models`, { timeout: 2000 });
        isLmStudioConnected = true;
      } catch (err) {
        console.log('LM Studio connection failed:', err.message);
      }
      
      try {
        const ollamaUrl = settings?.ollama?.apiUrl || 'http://localhost:11434';
        const baseUrl = ollamaUrl.startsWith('http') ? ollamaUrl : `http://${ollamaUrl}`;
        await axios.get(`${baseUrl}/api/tags`, { timeout: 2000 });
        isOllamaConnected = true;
      } catch (err) {
        console.log('Ollama connection failed:', err.message);
      }
      
      if (isLmStudioConnected || isOllamaConnected) {
        setConnectionStatus({
          status: 'connected',
          message: isLmStudioConnected && isOllamaConnected 
            ? 'Connected to LM Studio and Ollama'
            : isLmStudioConnected
              ? 'Connected to LM Studio'
              : 'Connected to Ollama'
        });
      } else {
        setConnectionStatus({
          status: 'error',
          message: 'No LLM server connected. Check server and settings.'
        });
      }
    } catch (error) {
      setConnectionStatus({
        status: 'error',
        message: 'Connection check failed'
      });
    }
  };

  /**
   * Handle messages from the ProjectManager agent
   */
  const handleProjectManagerMessage = (event) => {
    console.log('Received project-manager-message:', event.detail);
    
    // Extract message content from event detail, handling both formats
    const message = typeof event.detail === 'object' ? (event.detail.message || event.detail.content) : event.detail;
    
    if (!message) {
      console.error('Received empty message from ProjectManager');
      return;
    }
    
    // Add message to conversation with proper formatting
    const newMessage = {
      role: 'assistant',
      content: message,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Adding message to conversation:', newMessage);
    
    setConversation(prev => {
      // Remove any "thinking" messages first
      const filtered = prev.filter(msg => !msg.isThinking);
      return [...filtered, newMessage];
    });
    
    // Auto-scroll to bottom after a short delay to ensure content is rendered
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };
  
  /**
   * Send a message to the chat
   */
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // Add user message to chat history
    const userMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };
    
    // Add a "thinking" message
    const thinkingMessage = {
      role: 'assistant',
      content: 'Thinking...',
      timestamp: new Date().toISOString(),
      isThinking: true
    };
    
    setConversation(prev => [...prev, userMessage, thinkingMessage]);
    
    // Auto-scroll to bottom
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    
    console.log('Dispatching chat-message event with content:', message);
    
    // Dispatch custom event to notify ProjectManager
    const event = new CustomEvent('chat-message', {
      detail: {
        content: message.trim(),
        role: 'user',
        timestamp: new Date().toISOString(),
        serverType: server,
        model: model,
        apiUrl: server === 'lmstudio' ? lmStudioAddress : ollamaAddress
      }
    });
    window.dispatchEvent(event);
    
    // Clear input field
    setMessage('');
  };

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

  const handleResize = (event, { size }) => {
    // Only update if dimensions actually changed
    if (size.width !== width || size.height !== height) {
      // Calculate horizontal movement delta to keep right edge anchored
      const deltaX = size.width - width;
      const newX = position.x - deltaX;
      
      // Update dimensions only
      setWidth(size.width);
      setHeight(size.height);
      
      // Save for restoring after un-minimizing
      setExpandedDimensions({
        width: size.width,
        height: size.height
      });

      console.log('Resized to:', size.width, 'x', size.height);
    }
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

  /**
   * Handle mouse down event for dragging the widget
   */
  const handleMouseDown = (e) => {
    if (e.target.closest('.resize-handle')) return;
    if (e.target.closest('.chat-controls')) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
  };

  /**
   * Handle mouse move event for dragging or resizing the widget
   */
  const handleMouseMove = (e) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setPosition({
        x: position.x - deltaX,
        y: position.y - deltaY,
      });
      
      setDragStart({
        x: e.clientX,
        y: e.clientY,
      });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStartPosition.x;
      const deltaY = e.clientY - resizeStartPosition.y;
      
      setWidth(Math.max(300, resizeStartDimensions.width + deltaX));
      setHeight(Math.max(400, resizeStartDimensions.height + deltaY));
    }
  };

  /**
   * Handle mouse up event to end dragging or resizing
   */
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  /**
   * Handle resize initialization
   */
  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartDimensions({
      width: width,
      height: height,
    });
    setResizeStartPosition({
      x: e.clientX,
      y: e.clientY,
    });
  };

  /**
   * Toggle minimized state of the chat widget
   */
  const toggleMinimize = () => {
    const newMinimized = !minimized;
    setMinimized(newMinimized);
    
    // Dispatch event to update dock state
    const event = new CustomEvent('chat-widget-state-change', {
      detail: { isOpen: !newMinimized }
    });
    window.dispatchEvent(event);
  };

  /**
   * Close the chat widget
   */
  const closeChat = () => {
    // Hide the chat widget by setting it off-screen
    setPosition({ x: -1000, y: -1000 });
  };

  /**
   * Render a chat message
   */
  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    const isThinking = msg.isThinking;
    
    // Create a unique key for each message based on content and timestamp
    const messageKey = `msg-${msg.timestamp || Date.now()}-${index}`;
    
    return (
      <ListItem
        key={messageKey}
        sx={{
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          padding: '8px 16px',
          opacity: isThinking ? 0.7 : 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            maxWidth: '85%',
            flexDirection: isUser ? 'row-reverse' : 'row',
            alignItems: 'flex-start',
          }}
        >
          <Avatar 
            sx={{ 
              bgcolor: isUser ? 'primary.main' : 'secondary.main',
              width: 32,
              height: 32,
              marginRight: isUser ? 0 : 1,
              marginLeft: isUser ? 1 : 0,
            }}
          >
            {isUser ? <PersonIcon /> : <SmartToyIcon />}
          </Avatar>
          
          <Paper
            elevation={2}
            sx={{
              padding: '8px 16px',
              borderRadius: '12px',
              bgcolor: isUser ? 'primary.light' : 'background.paper',
              color: isUser ? 'primary.contrastText' : 'text.primary',
              maxWidth: '100%',
              wordBreak: 'break-word',
              '& pre': {
                overflowX: 'auto',
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#333' : '#f5f5f5',
                padding: '8px',
                borderRadius: '4px',
                color: (theme) => theme.palette.mode === 'dark' ? '#eee' : '#333',
                margin: '8px 0',
              },
              '& code': {
                fontFamily: 'monospace',
                backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#333' : '#f5f5f5',
                padding: '2px 4px',
                borderRadius: '4px',
                color: (theme) => theme.palette.mode === 'dark' ? '#eee' : '#333',
              },
            }}
          >
            <Typography variant="body1" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
              {isThinking ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>Thinking</span>
                  <span className="typing-dots">...</span>
                </Box>
              ) : (
                formatMessageContent(msg.content)
              )}
            </Typography>
            <Typography 
              variant="caption" 
              color="textSecondary" 
              sx={{ 
                display: 'block', 
                textAlign: isUser ? 'right' : 'left',
                fontSize: '0.7rem',
                mt: 0.5,
                opacity: 0.8
              }}
            >
              {formatTimestamp(msg.timestamp)}
            </Typography>
          </Paper>
        </Box>
      </ListItem>
    );
  };

  /**
   * Format message content with proper handling of code blocks and formatting
   */
  const formatMessageContent = (content) => {
    if (!content) return null;
    
    // Split content into segments based on code blocks
    return content.split('```').map((segment, index) => {
      if (index % 2 === 1) {
        // This is a code block
        return (
          <Box 
            component="pre" 
            key={index}
            sx={{ 
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#333' : '#f5f5f5',
              padding: '8px',
              borderRadius: '4px',
              overflowX: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              margin: '8px 0',
              width: '100%',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {segment}
          </Box>
        );
      }
      
      // Regular text - handle line breaks and inline formatting
      return (
        <React.Fragment key={index}>
          {segment.split('\n').map((line, i) => {
            // Convert **bold** to bold text
            line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            // Convert *italic* to italic text
            line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
            
            // Convert `code` to code formatting
            line = line.replace(/`(.*?)`/g, '<code>$1</code>');
            
            // Handle bullet points
            if (line.trim().startsWith('•')) {
              return (
                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
                  <Box component="span" sx={{ mr: 1 }}>•</Box>
                  <Box component="span" dangerouslySetInnerHTML={{ __html: line.substring(1) }} />
                </Box>
              );
            }
            
            return (
              <React.Fragment key={i}>
                <span dangerouslySetInnerHTML={{ __html: line }} />
                {i < segment.split('\n').length - 1 && <br />}
              </React.Fragment>
            );
          })}
        </React.Fragment>
      );
    });
  };

  /**
   * Format timestamp to display time in a user-friendly format
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // If minimized, don't render the widget
  if (minimized) {
    return null;
  }

  return (
    <Draggable 
      handle=".chat-header" 
      nodeRef={nodeRef}
      position={position}
      onDrag={handleDrag}
    >
      <div ref={nodeRef} style={{ 
        position: 'fixed', 
        zIndex: 1000,
        animation: 'pop-in 0.3s ease-out',
      }}>
        <style>
          {`
            @keyframes pop-in {
              0% {
                transform: scale(0.5);
                opacity: 0;
              }
              70% {
                transform: scale(1.05);
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }
          `}
        </style>
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
                    <InputLabel id="output-target-label">Output To</InputLabel>
                    <Select labelId="output-target-label" value={outputTarget} label="Output Target" onChange={(e) => setOutputTarget(e.target.value)}>
                      <MenuItem value="chat">Chat Only</MenuItem>
                      <MenuItem value="agent">Agent</MenuItem>
                    </Select>
                  </FormControl>
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
                
                <Box 
                  ref={chatContainerRef}
                  sx={{ 
                    overflowY: 'auto', 
                    flex: 1,
                    p: 1,
                    backgroundColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.8)' : '#f5f5f5',
                    borderRadius: 1,
                    '&::-webkit-scrollbar': {
                      width: '8px',
                      height: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                      background: (theme) => theme.palette.mode === 'dark' ? '#333' : '#f1f1f1',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      background: (theme) => theme.palette.mode === 'dark' ? '#666' : '#cccccc',
                      borderRadius: '4px',
                    },
                    '&::-webkit-scrollbar-thumb:hover': {
                      background: (theme) => theme.palette.mode === 'dark' ? '#888' : '#aaaaaa',
                    },
                  }}
                >
                  {conversation.map((msg, index) => renderMessage(msg, index))}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField 
                    label="Message" 
                    size="small"
                    fullWidth
                    value={message} 
                    onChange={handleMessageChange}
                    onKeyPress={handleKeyPress}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(0, 0, 0, 0.23)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'primary.main',
                        },
                      },
                    }}
                  />
                  <Button 
                    variant="contained" 
                    onClick={handleSendMessage}
                    disabled={!message.trim() || !model}
                    color="primary"
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
