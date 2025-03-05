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
  List,
  ListItem,
  Avatar,
  Alert,
} from '@mui/material';
import { Minimize as MinimizeIcon, OpenInFull as OpenInFullIcon, Send as SendIcon, Maximize as MaximizeIcon, Close as CloseIcon } from '@mui/icons-material';
import { Resizable } from 'react-resizable';
import Draggable from 'react-draggable';
import axios from 'axios';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useSelector } from 'react-redux';
import { useSocket } from '../../services/socket';

import 'react-resizable/css/styles.css';

// Constants
const DRAWER_WIDTH = 240; // Width of the sidebar drawer

/**
 * ProjectManagerChat component that provides a floating, resizable, draggable chat interface
 * for interacting with the Project Manager agent
 */
const ProjectManagerChat = () => {
  const nodeRef = useRef(null);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(400);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [minimized, setMinimized] = useState(true);
  const chatContainerRef = useRef(null);
  const [messageListenerAdded, setMessageListenerAdded] = useState(false);
  const settings = useSelector(state => state?.settings);
  const { connected, sendProjectManagerMessage } = useSocket();
  
  const [connectionStatus, setConnectionStatus] = useState({
    status: 'checking',
    message: 'Checking Project Manager connection...'
  });

  // Store last position before collapse to restore it when expanding
  const [expandedPosition, setExpandedPosition] = useState({ x: 0, y: 0 });
  // Store last dimensions before collapse to restore when expanding
  const [expandedDimensions, setExpandedDimensions] = useState({ width: 300, height: 400 });

  const [processedMessageIds] = useState(new Set());

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

    return () => {
      window.removeEventListener('toggle-chat-widget', handleDockToggle);
    };
  }, []); // Removed width/height from dependencies to avoid loops

  useEffect(() => {
    // Setup event listeners for project manager messages
    const handleProjectManagerMessage = (event) => {
      const { content, messageId, timestamp, error, source, channel } = event.detail;
      
      // Skip if we've already processed this message
      if (messageId && processedMessageIds.has(messageId)) {
        console.log('Skipping duplicate message:', messageId);
        return;
      }

      // Skip if not for chat widget
      if (source !== 'chat-widget' || channel !== 'chat-widget') {
        console.log('Skipping message not for chat widget:', { source, channel });
        return;
      }

      // Add to processed messages if we have an ID
      if (messageId) {
        processedMessageIds.add(messageId);
      }
      
      if (error) {
        // Handle error message
        setConversation(prev => {
          const filtered = prev.filter(msg => !msg.isThinking);
          return [...filtered, {
            role: 'assistant',
            content: content,
            timestamp: timestamp || new Date().toISOString(),
            error: true,
            messageId,
            source: 'chat-widget',
            channel: 'chat-widget'
          }];
        });
        return;
      }
      
      // Handle normal message
      setConversation(prev => {
        const filtered = prev.filter(msg => !msg.isThinking);
        return [...filtered, {
          role: 'assistant',
          content: content,
          timestamp: timestamp || new Date().toISOString(),
          messageId,
          source: 'chat-widget',
          channel: 'chat-widget'
        }];
      });
    };

    // Listen for chat widget specific messages
    window.addEventListener('chat-widget-message', handleProjectManagerMessage);
    return () => window.removeEventListener('chat-widget-message', handleProjectManagerMessage);
  }, [processedMessageIds]);
  
  // Auto-scroll to bottom when chat history updates
  useEffect(() => {
    if (chatContainerRef.current && !isCollapsed) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation, isCollapsed]);
  
  // Check server connection on component mount
  useEffect(() => {
    checkProjectManagerConnection();
    
    // Set up a periodic connection check
    const checkInterval = setInterval(checkProjectManagerConnection, 60000); // Check every minute
    
    return () => clearInterval(checkInterval);
  }, [settings]);
  
  // Check if Project Manager is connected and ready
  const checkProjectManagerConnection = async () => {
    setConnectionStatus({
      status: 'checking',
      message: 'Checking Project Manager connection...'
    });
    
    try {
      // Dispatch a connection check event
      const event = new CustomEvent('project-manager-check', {
        detail: { type: 'connection_check' }
      });
      window.dispatchEvent(event);
      
      // For now, assume connection is OK if we can dispatch events
      setConnectionStatus({
        status: 'connected',
        message: 'Connected to Project Manager'
      });
    } catch (error) {
      setConnectionStatus({
        status: 'error',
        message: 'Failed to connect to Project Manager'
      });
    }
  };

  /**
   * Send a message to the chat
   */
  const handleSendMessage = async () => {
    if (!message.trim() || !connected) return;

    const messageId = `msg-${Date.now()}`;
    const userMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString(),
      messageId,
      source: 'chat-widget',
      channel: 'chat-widget'
    };

    setConversation(prev => [...prev, userMessage, {
      role: 'assistant',
      content: 'Thinking...',
      timestamp: new Date().toISOString(),
      isThinking: true,
      messageId: `thinking-${messageId}`,
      source: 'chat-widget',
      channel: 'chat-widget'
    }]);

    // Send message with messageId, source and channel
    sendProjectManagerMessage(message.trim(), messageId, 'chat-widget', 'chat-widget');
    setMessage('');
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
    if (size.width !== width || size.height !== height) {
      setWidth(size.width);
      setHeight(size.height);
      setExpandedDimensions({ width: size.width, height: size.height });
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
            <Box
              sx={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 0.5,
              }}
            >
              <Typography 
                variant="caption" 
                color="textSecondary" 
                sx={{ 
                  fontSize: '0.7rem',
                  opacity: 0.8
                }}
              >
                {formatTimestamp(msg.timestamp)}
              </Typography>
            </Box>
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
    
    // Check if content is a command
    if (content.includes('run_terminal_cmd(')) {
      return (
        <Box sx={{ width: '100%' }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Let me execute this command for you:
          </Typography>
          <Box 
            component="pre"
            sx={{ 
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: 'divider',
              overflowX: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: (theme) => theme.palette.mode === 'dark' ? '#e6e6e6' : '#333',
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: (theme) => theme.palette.mode === 'dark' ? '#333' : '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: (theme) => theme.palette.mode === 'dark' ? '#666' : '#ccc',
                borderRadius: '4px',
              },
            }}
          >
            {content}
          </Box>
        </Box>
      );
    }
    
    // Split content into segments based on code blocks
    return content.split('```').map((segment, index) => {
      if (index % 2 === 1) {
        // This is a code block
        const [language, ...codeLines] = segment.split('\n');
        const code = codeLines.join('\n');
        
        return (
          <Box 
            component="pre" 
            key={index}
            sx={{ 
              backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
              padding: '12px',
              borderRadius: '6px',
              overflowX: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              margin: '8px 0',
              width: '100%',
              border: '1px solid',
              borderColor: 'divider',
              position: 'relative',
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: (theme) => theme.palette.mode === 'dark' ? '#333' : '#f1f1f1',
              },
              '&::-webkit-scrollbar-thumb': {
                background: (theme) => theme.palette.mode === 'dark' ? '#666' : '#ccc',
                borderRadius: '4px',
              },
            }}
          >
            {language && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  padding: '4px 8px',
                  backgroundColor: 'primary.main',
                  color: 'white',
                  borderBottomLeftRadius: '4px',
                  fontSize: '0.75rem',
                  opacity: 0.8,
                }}
              >
                {language}
              </Box>
            )}
            {code || segment}
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
            if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
              return (
                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
                  <Box component="span" sx={{ mr: 1 }}>{line.trim().startsWith('•') ? '•' : '•'}</Box>
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

  // If minimized, show only the floating button
  if (minimized) {
    return (
      <Box
        sx={{
          position: 'fixed',
          left: `${DRAWER_WIDTH + 16}px`,
          bottom: '16px',
          zIndex: 1000,
          transition: 'all 0.3s ease-in-out',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': {
              backgroundColor: 'primary.dark',
              transform: 'scale(1.1)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
          onClick={() => setMinimized(false)}
        >
          <SmartToyIcon />
        </Paper>
      </Box>
    );
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
              <Typography variant="subtitle1" fontWeight="bold">Project Manager</Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton onClick={handleCollapse} size="small" sx={{ color: 'white' }}>
                  {isCollapsed ? <OpenInFullIcon /> : <MinimizeIcon />}
                </IconButton>
                <IconButton onClick={() => setMinimized(true)} size="small" sx={{ color: 'white' }}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </Box>
            
            {!isCollapsed && (
              <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1, flex: 1, overflowY: 'hidden' }}>
                {connectionStatus.status === 'error' && (
                  <Alert severity="warning" sx={{ py: 0.5 }}>
                    {connectionStatus.message}
                  </Alert>
                )}
                
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
                  <List>
                    {conversation.map((msg, index) => renderMessage(msg, index))}
                    
                    {conversation.length === 0 && (
                      <ListItem>
                        <Paper 
                          sx={{ 
                            p: 2, 
                            width: '100%', 
                            textAlign: 'center',
                            bgcolor: 'background.default'
                          }}
                        >
                          <Typography variant="body2" color="textSecondary">
                            I'm your Project Manager assistant. How can I help you today?
                          </Typography>
                        </Paper>
                      </ListItem>
                    )}
                  </List>
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
                    disabled={!message.trim()}
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

export default ProjectManagerChat;
