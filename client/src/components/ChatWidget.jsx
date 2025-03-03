import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, TextField, IconButton, Avatar, 
  Divider, CircularProgress, Alert, Chip, Badge
} from '@mui/material';
import { Send, ErrorOutline, Close, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useSettings } from '../hooks/useSettings';
import { useSocket } from '../services/socket';
import '../styles/ChatWidget.css';

/**
 * ChatWidget Component - Floating chat widget for quick communication
 */
const ChatWidget = () => {
  const { settings } = useSettings();
  const { socket, connected } = useSocket();
  const [expanded, setExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Initialize with system message
  useEffect(() => {
    if (settings && settings.system) {
      // Find the Project Manager agent and use real data
      const projectManagerAgent = settings.agents?.items?.find(agent => agent.isProjectManager === true);
      
      // Check if we have a valid Project Manager agent and if we're connected
      if (!projectManagerAgent) {
        // System message for when Project Manager is not configured
        const welcomeMessage = {
          id: 'system-welcome',
          author: 'System',
          content: 'Project Manager agent is not configured. Please go to Settings > Project Manager to set up the agent.',
          timestamp: new Date().toLocaleTimeString(),
          avatar: '/static/images/avatar/system.png'
        };
        setMessages([welcomeMessage]);
        return;
      }
      
      // Create welcome message using real data from the Project Manager agent
      const welcomeMessage = {
        id: 'system-welcome',
        author: projectManagerAgent.name,
        content: `Hello! I am ${projectManagerAgent.name}. I can help you create and manage agents, configure tools, and optimize your environment. How can I assist you today?`,
        timestamp: new Date().toLocaleTimeString(),
        avatar: '/static/images/avatar/system.png'
      };
      
      setMessages([welcomeMessage]);
    }
  }, [settings]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    const handleNewMessage = (data) => {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}`,
        author: data.author || 'Unknown',
        content: data.content,
        timestamp: new Date().toLocaleTimeString(),
        avatar: data.avatar || '/static/images/avatar/default.png'
      }]);

      // Increment unread count if widget is collapsed
      if (!expanded) {
        setUnreadCount(prev => prev + 1);
      }
    };

    socket.on('new_message', handleNewMessage);

    // Cleanup
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, expanded]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && expanded) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, expanded]);

  // Reset unread count when expanded
  useEffect(() => {
    if (expanded) {
      setUnreadCount(0);
    }
  }, [expanded]);

  // Handle sending a message
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    // Create user message
    const message = {
      id: `msg-${Date.now()}`,
      author: 'You',
      content: newMessage,
      timestamp: new Date().toLocaleTimeString(),
      avatar: '/static/images/avatar/user.png'
    };

    // Add user message to local state
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Send message via socket if connected
    if (socket && connected) {
      socket.emit('send_message', {
        content: newMessage,
        channel: 'widget'
      });
    } else {
      // Add system message indicating offline state
      const offlineMessage = {
        id: `system-${Date.now()}`,
        author: 'System',
        content: 'You are currently offline. Your message has been saved locally but the Project Manager cannot respond until connection is restored.',
        timestamp: new Date().toLocaleTimeString(),
        avatar: '/static/images/avatar/system.png'
      };
      
      setMessages(prev => [...prev, offlineMessage]);
      setError('Connection to server lost. Reconnecting...');
      setTimeout(() => setError(null), 3000);
    }
  }, [newMessage, socket, connected]);

  // Toggle widget expansion
  const toggleExpanded = () => {
    setExpanded(prev => !prev);
  };

  // Get the title for the chat widget
  const getChatTitle = () => {
    if (settings?.system?.developerMode) {
      return 'Developer Chat';
    }
    
    // Use the Project Manager name if available
    const projectManager = settings?.agents?.items?.find(agent => agent.isProjectManager === true);
    return projectManager?.name || 'Project Manager';
  };

  return (
    <Paper 
      elevation={3} 
      className="chat-widget"
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: expanded ? 320 : 'auto',
        height: expanded ? 400 : 'auto',
        borderRadius: 2,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme => theme.palette.background.paper
      }}
    >
      {/* Header */}
      <Box 
        sx={{
          p: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: theme => theme.palette.primary.main,
          color: theme => theme.palette.primary.contrastText,
          cursor: 'pointer'
        }}
        onClick={toggleExpanded}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
          {getChatTitle()}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {!connected && (
            <Badge color="error" variant="dot" sx={{ mr: 1 }}>
              <ErrorOutline fontSize="small" />
            </Badge>
          )}
          <IconButton 
            size="small" 
            sx={{ color: 'inherit', p: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
          >
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
      </Box>

      {/* Expanded content */}
      {expanded && (
        <>
          {/* Connection error */}
          {!connected && (
            <Box className="chat-connection-error">
              <ErrorOutline fontSize="small" />
              <Typography variant="caption">
                Not connected to server. Messages will be stored locally.
              </Typography>
            </Box>
          )}

          {/* Error message */}
          {error && (
            <Alert 
              severity="warning" 
              sx={{ m: 1, py: 0.5 }}
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() => setError(null)}
                >
                  <Close fontSize="inherit" />
                </IconButton>
              }
            >
              <Typography variant="caption">{error}</Typography>
            </Alert>
          )}

          {/* Messages */}
          <Box 
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              messages.map(message => (
                <Box 
                  key={message.id} 
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1
                  }}
                >
                  <Avatar 
                    src={message.avatar} 
                    sx={{ width: 28, height: 28 }}
                    alt={message.author}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {message.author}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {message.timestamp}
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {message.content}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box 
            sx={{
              p: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider'
            }}
          >
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              InputProps={{
                endAdornment: (
                  <IconButton 
                    size="small"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    color="primary"
                  >
                    <Send fontSize="small" />
                  </IconButton>
                )
              }}
            />
          </Box>
        </>
      )}

      {/* Collapsed state with notification badge */}
      {!expanded && unreadCount > 0 && (
        <Badge 
          badgeContent={unreadCount} 
          color="error"
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            transform: 'translate(25%, -25%)'
          }}
        />
      )}
    </Paper>
  );
};

export default ChatWidget;
