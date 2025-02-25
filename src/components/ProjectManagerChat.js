import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Tooltip,
} from '@mui/material';
import { Minimize as MinimizeIcon, OpenInFull as OpenInFullIcon, Send as SendIcon, Maximize as MaximizeIcon, Close as CloseIcon, Refresh as RefreshIcon, DeleteSweep as DeleteSweepIcon } from '@mui/icons-material';
import Draggable from 'react-draggable';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useDispatch, useSelector } from 'react-redux';
import { logInfo, logError, logWarning, LOG_CATEGORIES } from '../store/actions/logActions';
import { addNotification } from '../store/actions/systemActions';

import 'react-resizable/css/styles.css';

/**
 * ProjectManagerChat component that provides a floating, resizable, draggable chat interface
 * for interacting with the Project Manager agent. This agent is persistent across the project
 * and uses a dedicated LLM endpoint with function calling capabilities.
 */
const ProjectManagerChat = () => {
  const dispatch = useDispatch();
  const nodeRef = useRef(null);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [width, setWidth] = useState(350);
  const [height, setHeight] = useState(500);
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
  const [projectManagerRequestListenerAdded, setProjectManagerRequestListenerAdded] = useState(false);

  // Store last position before collapse to restore it when expanding
  const [expandedPosition, setExpandedPosition] = useState({ x: 0, y: 0 });
  // Store last dimensions before collapse to restore when expanding
  const [expandedDimensions, setExpandedDimensions] = useState({ width: 350, height: 500 });
  
  // Get Project Manager settings from Redux store with fallbacks
  const settings = useSelector(state => state.settings);
  const projectManagerSettings = useMemo(() => {
    // Try to get settings from Redux
    const reduxSettings = settings?.projectManager;
    
    // Try to get cached settings from sessionStorage
    const cachedSettings = JSON.parse(sessionStorage.getItem('projectManagerSettings') || 'null');
    
    // Use Redux settings, cached settings, or defaults
    return reduxSettings || cachedSettings || {
      apiUrl: settings?.lmStudio?.apiUrl || 'http://localhost:1234',
      model: settings?.lmStudio?.defaultModel || 'qwen2.5-7b-instruct-1m',
      serverType: 'lmStudio',
      loading: false,
      error: null,
      parameters: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        repeatPenalty: 1.1,
        maxTokens: 1024,
        contextLength: 4096
      }
    };
  }, [settings]);

  // Cache settings when they change
  useEffect(() => {
    if (projectManagerSettings) {
      sessionStorage.setItem('projectManagerSettings', JSON.stringify(projectManagerSettings));
    }
  }, [projectManagerSettings]);

  /**
   * Initialize or reinitialize the Project Manager settings
   */
  const initializeSettings = async () => {
    try {
      // Log the current settings
      dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Initializing Project Manager settings',
        { settings: projectManagerSettings }
      ));
      
      // Try to validate the connection
      const response = await fetch(`${projectManagerSettings.apiUrl}/v1/models`);
      if (!response.ok) {
        throw new Error(`Failed to connect to LM Studio: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data?.data?.some(model => model.id === projectManagerSettings.model)) {
        throw new Error(`Model ${projectManagerSettings.model} not found`);
      }

      // Log successful initialization
      dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Project Manager settings initialized successfully',
        {
          settings: projectManagerSettings,
          availableModels: data.data.map(m => m.id)
        }
      ));
      
      // Cache validated settings
      sessionStorage.setItem('projectManagerSettings', JSON.stringify(projectManagerSettings));

      return true;
    } catch (error) {
      // Log initialization error
      dispatch(logError(
        LOG_CATEGORIES.AGENT,
        'Failed to initialize Project Manager settings',
        {
          error: error.message,
          settings: projectManagerSettings
        }
      ));
      
      // Try to load cached settings from sessionStorage
      const cachedSettings = JSON.parse(sessionStorage.getItem('projectManagerSettings') || 'null');
      if (cachedSettings) {
        dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          'Using cached Project Manager settings',
          { settings: cachedSettings }
        ));
      }

      return false;
    }
  };

  // Initialize settings on mount
  useEffect(() => {
    initializeSettings();
  }, [dispatch, projectManagerSettings]);

  // Initialize position and load conversation history
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
        // Add welcome message if loading fails
        addWelcomeMessage();
      }
    } else {
      // Add welcome message if no conversation exists
      addWelcomeMessage();
    }

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('toggle-project-manager-chat', handleDockToggle);
    };
  }, [width, height]);

  // Add message listener for receiving responses from the Project Manager agent
  useEffect(() => {
    if (!messageListenerAdded) {
      const handleProjectManagerMessageEvent = (event) => {
        // Only handle events specifically meant for ProjectManagerChat
        if (event.detail?.target !== 'project-manager') {
          return;
        }
        handleProjectManagerMessage(event);
      };
      
      window.addEventListener('project-manager-message', handleProjectManagerMessageEvent);
      setMessageListenerAdded(true);
      
      return () => {
        window.removeEventListener('project-manager-message', handleProjectManagerMessageEvent);
      };
    }
  }, [messageListenerAdded]);
  
  // Add listener for project manager requests
  useEffect(() => {
    if (!projectManagerRequestListenerAdded) {
      // Remove any existing thinking messages when a new response comes in
      const cleanupThinkingMessages = (event) => {
        // Only handle events specifically meant for ProjectManagerChat
        if (event.detail?.target !== 'project-manager') {
          return;
        }
        setConversation(prev => prev.filter(msg => !msg.isThinking));
      };
      
      window.addEventListener('project-manager-message', cleanupThinkingMessages);
      setProjectManagerRequestListenerAdded(true);
      
      return () => {
        window.removeEventListener('project-manager-message', cleanupThinkingMessages);
      };
    }
  }, [projectManagerRequestListenerAdded]);

  // Scroll to bottom of chat when conversation updates
  useEffect(() => {
    if (chatContainerRef.current && !minimized) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    
    // Save conversation to localStorage
    localStorage.setItem('projectManagerConversation', JSON.stringify(conversation));
  }, [conversation, minimized]);

  // Add cleanup for event listeners on component unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  /**
   * Handle messages from the ProjectManager agent
   */
  const handleProjectManagerMessage = (event) => {
    // Extract message content from event detail
    const { 
      content,
      messageId,
      isThinking,
      temporary,
      replaces,
      isError
    } = event.detail;
    
    if (!content) {
      console.error('Received empty message from ProjectManager');
      return;
    }
    
    // Create new message object
    const newMessage = {
      role: 'assistant',
      content,
      messageId,
      timestamp: new Date().toISOString(),
      isThinking,
      temporary,
      isError
    };
    
    setConversation(prev => {
      // If this message replaces another, remove the one being replaced
      const filtered = replaces ? 
        prev.filter(msg => msg.messageId !== replaces) : 
        prev;
      
      // If temporary, remove other temporary messages
      const withoutTemporary = temporary ?
        filtered.filter(msg => !msg.temporary) :
        filtered;
      
      return [...withoutTemporary, newMessage];
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
    
    // Generate a unique message ID
    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add user message to chat history
    const userMessage = {
      role: 'user',
      content: message.trim(),
      messageId,
      timestamp: new Date().toISOString()
    };
    
    setConversation(prev => [...prev, userMessage]);
    
    // Auto-scroll to bottom
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    
    // Add thinking message
    const thinkingMessage = {
      role: 'assistant',
      content: 'Thinking...',
      messageId: `thinking-${messageId}`,
      timestamp: new Date().toISOString(),
      isThinking: true,
      temporary: true
    };
    
    setConversation(prev => [...prev, thinkingMessage]);
    
    // Dispatch custom event to notify ProjectManager
    const event = new CustomEvent('project-manager-request', {
      detail: {
        target: 'project-manager',
        message: message.trim(),
        messageId,
        timestamp: new Date().toISOString(),
        settings: projectManagerSettings // Include the current settings
      }
    });
    window.dispatchEvent(event);
    
    // Clear input field
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
    
    // Add global event listeners for resize
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    
    // Prevent text selection during resize
    e.preventDefault();
  };
  
  const handleResizeMove = (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStartPosition.x;
    const deltaY = e.clientY - resizeStartPosition.y;
    
    const newWidth = Math.max(300, resizeStartDimensions.width + deltaX);
    const newHeight = Math.max(200, resizeStartDimensions.height + deltaY);
    
    setWidth(newWidth);
    setHeight(newHeight);
    setExpandedDimensions({ width: newWidth, height: newHeight });
  };
  
  const handleResizeEnd = () => {
    setIsResizing(false);
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
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

  const addWelcomeMessage = () => {
    const welcomeMessage = {
      role: 'assistant',
      content: 'Hello! I am your Project Manager assistant. I can help you manage your project, organize tasks, and provide guidance. How can I assist you today?',
      timestamp: new Date().toISOString()
    };
    setConversation([welcomeMessage]);
    localStorage.setItem('projectManagerConversation', JSON.stringify([welcomeMessage]));
  };

  /**
   * Reset the chat history and settings
   */
  const handleReset = async () => {
    try {
      // Clear conversation history
      setConversation([]);
      localStorage.removeItem('projectManagerConversation');
      
      // Clear cached settings
      sessionStorage.removeItem('projectManagerSettings');
      
      // Re-initialize settings
      const success = await initializeSettings();
      
      if (success) {
        // Add welcome message
        addWelcomeMessage();
        
        // Log the reset
        dispatch(logInfo(
          LOG_CATEGORIES.AGENT,
          'Project Manager chat has been reset successfully'
        ));

        // Notify user of successful reset
        const resetMessage = {
          role: 'assistant',
          content: 'Chat has been reset successfully. Settings have been reinitialized.',
          timestamp: new Date().toISOString()
        };
        setConversation([resetMessage]);
      } else {
        // Show error message if initialization failed
        const errorMessage = {
          role: 'assistant',
          content: 'Chat has been reset, but there was an issue reinitializing settings. Using default or cached settings.',
          timestamp: new Date().toISOString(),
          isError: true
        };
        setConversation([errorMessage]);
      }
    } catch (error) {
      // Handle any errors during reset
      dispatch(logError(
        LOG_CATEGORIES.AGENT,
        'Error resetting Project Manager chat',
        { error: error.message }
      ));

      const errorMessage = {
        role: 'assistant',
        content: `Error resetting chat: ${error.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      setConversation([errorMessage]);
    }
  };

  /**
   * Test the LLM connection
   */
  const handleTest = async () => {
    try {
      // Show testing message
      const testingMessage = {
        role: 'assistant',
        content: 'Testing LLM connection...',
        messageId: `test-${Date.now()}`,
        timestamp: new Date().toISOString(),
        isThinking: true
      };
      setConversation(prev => [...prev, testingMessage]);

      // Format API URL
      let apiUrl = projectManagerSettings.apiUrl;
      if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
        apiUrl = `http://${apiUrl}`;
      }
      apiUrl = apiUrl.replace(/\/+$/, '');

      // Test models endpoint
      const modelsResponse = await fetch(`${apiUrl}/v1/models`);
      if (!modelsResponse.ok) {
        throw new Error(`Failed to connect to LLM server: ${modelsResponse.statusText}`);
      }

      const models = await modelsResponse.json();
      if (!models?.data?.some(model => model.id === projectManagerSettings.model)) {
        throw new Error(`Model ${projectManagerSettings.model} not found on server`);
      }

      // Test chat completion
      const completionResponse = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: projectManagerSettings.model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant.'
            },
            {
              role: 'user',
              content: 'Test message'
            }
          ],
          max_tokens: 5
        })
      });

      if (!completionResponse.ok) {
        throw new Error(`Chat completion test failed: ${completionResponse.statusText}`);
      }

      const completion = await completionResponse.json();
      if (!completion?.choices?.[0]?.message) {
        throw new Error('Invalid response format from test completion');
      }

      // Show success message
      const successMessage = {
        role: 'assistant',
        content: '✅ Connection test successful!\n\n' +
                `• Server: ${apiUrl}\n` +
                `• Model: ${projectManagerSettings.model}\n` +
                `• Available models: ${models.data.map(m => m.id).join(', ')}`,
        messageId: `test-success-${Date.now()}`,
        timestamp: new Date().toISOString()
      };

      setConversation(prev => [...prev.filter(msg => !msg.isThinking), successMessage]);
      
      // Log success
      dispatch(logInfo(
        LOG_CATEGORIES.AGENT,
        'Project Manager connection test successful',
        { settings: projectManagerSettings }
      ));

    } catch (error) {
      // Show error message
      const errorMessage = {
        role: 'assistant',
        content: `❌ Connection test failed: ${error.message}`,
        messageId: `test-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        isError: true
      };

      setConversation(prev => [...prev.filter(msg => !msg.isThinking), errorMessage]);
      
      // Log error
      dispatch(logError(
        LOG_CATEGORIES.AGENT,
        'Project Manager connection test failed',
        { error: error.message }
      ));
    }
  };

  /**
   * Render a chat message
   */
  const renderMessage = (msg, index) => {
    const isUser = msg.role === 'user';
    const isThinking = msg.isThinking;
    const isError = msg.isError;
    
    return (
      <ListItem
        key={msg.messageId || index}
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
              bgcolor: isUser ? 'primary.main' : isError ? 'error.main' : 'secondary.main',
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
              bgcolor: isError ? 'error.light' : (isUser ? 'primary.light' : 'background.paper'),
              color: isUser || isError ? 'primary.contrastText' : 'text.primary',
              maxWidth: '100%',
              wordBreak: 'break-word',
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
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Test Connection">
              <IconButton
                size="small"
                onClick={handleTest}
                sx={{ color: 'primary.contrastText', padding: '4px' }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset Chat">
              <IconButton
                size="small"
                onClick={handleReset}
                sx={{ color: 'primary.contrastText', padding: '4px' }}
              >
                <DeleteSweepIcon fontSize="small" />
              </IconButton>
            </Tooltip>
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
              width: '20px',
              height: '20px',
              cursor: 'nwse-resize',
              backgroundColor: 'rgba(0, 0, 0, 0.05)',
              borderTop: '1px solid',
              borderLeft: '1px solid',
              borderColor: 'divider',
              borderTopLeftRadius: '4px',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: '5px',
                right: '5px',
                width: '6px',
                height: '6px',
                borderBottom: '2px solid',
                borderRight: '2px solid',
                borderColor: 'rgba(0, 0, 0, 0.3)',
              }
            }}
            onMouseDown={handleResizeStart}
          />
        )}
      </Box>
    </Draggable>
  );
};

export default ProjectManagerChat; 