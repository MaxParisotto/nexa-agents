import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Button,
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
import { useDispatch, useSelector } from 'react-redux';
import { logInfo, logError, LOG_CATEGORIES } from '../store/actions/logActions';
import { addNotification } from '../store/actions/systemActions';

import 'react-resizable/css/styles.css';

/**
 * ProjectManagerChat component that provides a floating, resizable, draggable chat interface
 * for interacting with the Project Manager agent. This agent is persistent across the project
 * and uses a dedicated LLM endpoint (DeepSeek R1) with function calling capabilities.
 */
const ProjectManagerChat = () => {
  const dispatch = useDispatch();
  const nodeRef = useRef(null);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
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

  // Store last position before collapse to restore it when expanding
  const [expandedPosition, setExpandedPosition] = useState({ x: 0, y: 0 });
  // Store last dimensions before collapse to restore when expanding
  const [expandedDimensions, setExpandedDimensions] = useState({ width: 300, height: 400 });
  
  // Get Project Manager settings from Redux store
  const settings = useSelector(state => state.settings);
  const projectManagerSettings = settings?.projectManager || {
    apiUrl: '',
    model: '',
    loading: false,
    error: null
  };

  useEffect(() => {
    // Setup event listener for dock toggling
    const handleDockToggle = (event) => {
      const { isOpen, chatType } = event.detail;
      
      // Only respond to project manager chat toggle events
      if (chatType !== 'projectManager') return;
      
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
    
    window.addEventListener('toggle-project-manager-chat', handleDockToggle);
    
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

    // Load conversation history from localStorage
    const savedConversation = localStorage.getItem('projectManagerConversation');
    if (savedConversation) {
      try {
        setConversation(JSON.parse(savedConversation));
      } catch (error) {
        console.error('Failed to parse saved conversation:', error);
      }
    }

    // Add welcome message if no conversation exists
    if (!savedConversation) {
      const welcomeMessage = {
        role: 'assistant',
        content: 'Hello! I am your Project Manager assistant. I can help you manage your project, organize tasks, and provide guidance. How can I assist you today?',
        timestamp: new Date().toISOString()
      };
      setConversation([welcomeMessage]);
      localStorage.setItem('projectManagerConversation', JSON.stringify([welcomeMessage]));
    }

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('toggle-project-manager-chat', handleDockToggle);
    };
  }, [width, height]);

  // Add message listener for receiving responses from the Project Manager agent
  useEffect(() => {
    if (!messageListenerAdded) {
      window.addEventListener('project-manager-message', handleProjectManagerMessage);
      setMessageListenerAdded(true);
      
      return () => {
        window.removeEventListener('project-manager-message', handleProjectManagerMessage);
      };
    }
  }, [messageListenerAdded]);

  // Scroll to bottom of chat when conversation updates
  useEffect(() => {
    if (chatContainerRef.current && !minimized) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    
    // Save conversation to localStorage
    localStorage.setItem('projectManagerConversation', JSON.stringify(conversation));
  }, [conversation, minimized]);

  /**
   * Handle messages from the Project Manager agent
   */
  const handleProjectManagerMessage = (event) => {
    const { message } = event.detail;
    
    if (message && typeof message === 'string') {
      const newMessage = {
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      setConversation(prev => [...prev, newMessage]);
    }
  };

  /**
   * Send a message to the Project Manager agent
   */
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    // Add user message to conversation
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    setConversation(prev => [...prev, userMessage]);
    
    // Clear input field
    setMessage('');
    
    try {
      // Dispatch a custom event to notify the Project Manager component
      const event = new CustomEvent('project-manager-request', {
        detail: { message: userMessage.content }
      });
      window.dispatchEvent(event);
      
      // Add a temporary "thinking" message
      const thinkingMessage = {
        role: 'assistant',
        content: '...',
        timestamp: new Date().toISOString(),
        isThinking: true
      };
      
      setConversation(prev => [...prev, thinkingMessage]);
      
      // The response will come through the project-manager-message event
    } catch (error) {
      console.error('Error sending message to Project Manager:', error);
      dispatch(logError(LOG_CATEGORIES.AGENT, 'Failed to send message to Project Manager', error));
      
      // Remove the thinking message and add an error message
      setConversation(prev => {
        const filtered = prev.filter(msg => !msg.isThinking);
        return [...filtered, {
          role: 'assistant',
          content: 'Sorry, I encountered an error while processing your request. Please try again later.',
          timestamp: new Date().toISOString(),
          isError: true
        }];
      });
    }
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
    event.preventDefault();
    setWidth(size.width);
    setHeight(size.height);
    setExpandedDimensions({ width: size.width, height: size.height });
  };

  const handleDrag = (e, ui) => {
    const { x, y } = ui;
    setPosition({ x, y });
    
    if (!isCollapsed) {
      setExpandedPosition({ x, y });
    }
  };

  const handleCollapse = () => {
    if (isCollapsed) {
      // Expanding
      setIsCollapsed(false);
      setPosition(expandedPosition);
      setWidth(expandedDimensions.width);
      setHeight(expandedDimensions.height);
    } else {
      // Collapsing
      setExpandedPosition({ ...position });
      setExpandedDimensions({ width, height });
      setIsCollapsed(true);
      setHeight(40); // Collapsed height
    }
  };

  const handleMouseDown = (e) => {
    // Only start dragging if clicking on the header
    if (e.target.closest('.chat-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      
      // Prevent text selection during drag
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Constrain to viewport
      const maxX = window.innerWidth - width;
      const maxY = window.innerHeight - height;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
      
      if (!isCollapsed) {
        setExpandedPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResizeStart = (e) => {
    setIsResizing(true);
    setResizeStartDimensions({
      width,
      height
    });
    setResizeStartPosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  const toggleMinimize = () => {
    setMinimized(!minimized);
    
    // Dispatch event to notify other components
    const event = new CustomEvent('project-manager-chat-visibility-changed', {
      detail: { isVisible: minimized }
    });
    window.dispatchEvent(event);
  };

  const closeChat = () => {
    setMinimized(true);
    
    // Dispatch event to notify other components
    const event = new CustomEvent('project-manager-chat-visibility-changed', {
      detail: { isVisible: false }
    });
    window.dispatchEvent(event);
  };

  /**
   * Render a single message in the chat
   */
  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    const isThinking = msg.isThinking;
    const isError = msg.isError;
    
    return (
      <ListItem 
        key={index} 
        sx={{ 
          flexDirection: 'column', 
          alignItems: isUser ? 'flex-end' : 'flex-start',
          padding: '8px 16px'
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'row',
            alignItems: 'flex-start',
            width: '100%',
            justifyContent: isUser ? 'flex-end' : 'flex-start'
          }}
        >
          {!isUser && (
            <Avatar 
              sx={{ 
                bgcolor: isError ? 'error.main' : 'primary.main',
                width: 28, 
                height: 28,
                marginRight: 1,
                marginTop: 0.5
              }}
            >
              <SmartToyIcon sx={{ fontSize: 18 }} />
            </Avatar>
          )}
          
          <Paper 
            elevation={1} 
            sx={{ 
              padding: '8px 12px', 
              maxWidth: '80%',
              backgroundColor: isUser ? 'primary.light' : isError ? 'error.light' : 'background.paper',
              color: isUser ? 'primary.contrastText' : isError ? 'error.contrastText' : 'text.primary',
              borderRadius: isUser ? '12px 12px 0 12px' : '12px 12px 12px 0',
              wordBreak: 'break-word'
            }}
          >
            {isThinking ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px' }}>
                <Typography variant="body2" sx={{ fontStyle: 'italic' }}>Thinking...</Typography>
              </Box>
            ) : (
              <Typography variant="body2">{formatMessageContent(msg.content)}</Typography>
            )}
          </Paper>
          
          {isUser && (
            <Avatar 
              sx={{ 
                bgcolor: 'secondary.main',
                width: 28, 
                height: 28,
                marginLeft: 1,
                marginTop: 0.5
              }}
            >
              <PersonIcon sx={{ fontSize: 18 }} />
            </Avatar>
          )}
        </Box>
        
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ 
            alignSelf: isUser ? 'flex-end' : 'flex-start',
            marginTop: '2px',
            marginLeft: isUser ? 0 : '36px',
            marginRight: isUser ? '36px' : 0
          }}
        >
          {formatTimestamp(msg.timestamp)}
        </Typography>
      </ListItem>
    );
  };

  /**
   * Format message content with proper handling of code blocks and links
   */
  const formatMessageContent = (content) => {
    if (!content) return '';
    
    // Simple formatting for code blocks
    const formattedContent = content.split('```').map((segment, index) => {
      if (index % 2 === 1) {
        // This is a code block
        return (
          <Box 
            component="pre" 
            key={index}
            sx={{ 
              backgroundColor: 'background.default',
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
      } else {
        // Regular text - handle line breaks
        return (
          <React.Fragment key={index}>
            {segment.split('\n').map((line, i) => (
              <React.Fragment key={i}>
                {line}
                {i < segment.split('\n').length - 1 && <br />}
              </React.Fragment>
            ))}
          </React.Fragment>
        );
      }
    });
    
    return formattedContent;
  };

  /**
   * Format timestamp to a readable format
   */
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };

  // Don't render if minimized
  if (minimized) return null;

  return (
    <Draggable
      nodeRef={nodeRef}
      position={position}
      onDrag={handleDrag}
      handle=".chat-header"
      bounds="parent"
    >
      <Box
        ref={nodeRef}
        sx={{
          position: 'fixed',
          zIndex: 1000,
          width: `${width}px`,
          height: `${height}px`,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 3,
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Chat Header */}
        <Box
          className="chat-header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            cursor: 'move',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SmartToyIcon sx={{ marginRight: 1, fontSize: 20 }} />
            <Typography variant="subtitle2">Project Manager</Typography>
          </Box>
          <Box>
            <IconButton
              size="small"
              onClick={handleCollapse}
              sx={{ color: 'primary.contrastText', padding: '4px' }}
            >
              {isCollapsed ? <OpenInFullIcon fontSize="small" /> : <MinimizeIcon fontSize="small" />}
            </IconButton>
            <IconButton
              size="small"
              onClick={closeChat}
              sx={{ color: 'primary.contrastText', padding: '4px' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Chat Messages */}
        {!isCollapsed && (
          <Box
            ref={chatContainerRef}
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              backgroundColor: 'background.default',
              padding: '8px 0',
            }}
          >
            <List disablePadding>
              {conversation.map((msg, index) => renderMessage(msg, index))}
            </List>
          </Box>
        )}

        {/* Chat Input */}
        {!isCollapsed && (
          <Box
            sx={{
              display: 'flex',
              padding: '8px',
              borderTop: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              variant="outlined"
              value={message}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={4}
              sx={{ marginRight: 1 }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSendMessage}
              disabled={!message.trim()}
              sx={{ minWidth: '40px', width: '40px', height: '40px', padding: 0 }}
            >
              <SendIcon />
            </Button>
          </Box>
        )}

        {/* Resize Handle */}
        {!isCollapsed && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '15px',
              height: '15px',
              cursor: 'nwse-resize',
            }}
            onMouseDown={handleResizeStart}
          />
        )}
      </Box>
    </Draggable>
  );
};

export default ProjectManagerChat; 