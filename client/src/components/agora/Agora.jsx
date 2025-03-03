import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, TextField, IconButton, Avatar, 
  Divider, CircularProgress, Alert, Chip
} from '@mui/material';

import { Send, Tag, Add } from '@mui/icons-material';
import { useSettings } from '../../contexts/SettingsContext';
import { apiService } from '../../services/api';
import { useSocket } from '../../services/socket.jsx';

/**
 * Agora Component - Discord-like chat interface for agent collaboration
 */
export default function Agora() {
  const { settings } = useSettings();
  const { socket, connected } = useSocket();
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [channels, setChannels] = useState([
    { id: 'general', name: 'general', unread: 0 },
    { id: 'agents', name: 'agents', unread: 0 },
    { id: 'system', name: 'system', unread: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);

  // Fetch agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await apiService.getAgents();
        if (response && response.data) {
          setAgents(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    };

    fetchAgents();
  }, []);

  // Initialize with system message
  useEffect(() => {
    setMessages([{
      id: 1,
      author: 'Nexa System',
      content: 'Welcome to Agora collaboration space!',
      timestamp: new Date().toLocaleTimeString(),
      avatar: '/static/images/avatar/system.png'
    }]);
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    const handleNewMessage = (data) => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        author: data.author || 'Unknown',
        content: data.content,
        mentions: data.mentions || [],
        timestamp: new Date().toLocaleTimeString(),
        avatar: data.avatar || '/static/images/avatar/default.png'
      }]);

      // Update unread count if not in the current channel
      if (data.channel && data.channel !== selectedChannel) {
        setChannels(prev => prev.map(channel => 
          channel.id === data.channel 
            ? { ...channel, unread: channel.unread + 1 } 
            : channel
        ));
      }
    };

    socket.on('new_message', handleNewMessage);

    // Cleanup
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, selectedChannel]);

  // Handle sending a message
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    const mentions = [];
    const content = newMessage.replace(/@(\w+)/g, (match, username) => {
      const agent = agents.find(a => a.name === username);
      if (agent) {
        mentions.push(agent.id);
        return `@${username}`;
      }
      return match;
    });

    // Add message to local state
    const message = {
      id: messages.length + 1,
      author: 'You',
      content,
      mentions,
      channel: selectedChannel,
      timestamp: new Date().toLocaleTimeString(),
      avatar: '/static/images/avatar/user.png'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Send message via socket if connected
    if (socket && connected) {
      socket.emit('send_message', {
        content,
        mentions,
        channel: selectedChannel
      });
    }
  }, [newMessage, agents, messages.length, selectedChannel, socket, connected]);

  // Handle channel selection
  const handleChannelSelect = (channelId) => {
    setSelectedChannel(channelId);
    
    // Mark channel as read
    setChannels(prev => prev.map(channel => 
      channel.id === channelId ? { ...channel, unread: 0 } : channel
    ));
  };

  // CSS styles
  const styles = {
    container: {
      display: 'flex',
      height: 'calc(100vh - 180px)',
      minHeight: '500px',
      borderRadius: 1,
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
    },
    sidebar: {
      width: '240px',
      backgroundColor: 'background.paper',
      borderRight: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column'
    },
    sidebarHeader: {
      padding: 2,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid',
      borderColor: 'divider'
    },
    channelList: {
      flex: 1,
      overflowY: 'auto',
      padding: 1
    },
    channelItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      borderRadius: 1,
      cursor: 'pointer',
      marginBottom: 0.5,
      '&:hover': {
        backgroundColor: 'action.hover'
      },
      '&.active': {
        backgroundColor: 'primary.main',
        color: 'primary.contrastText'
      }
    },
    unreadBadge: {
      backgroundColor: 'error.main',
      color: 'error.contrastText',
      borderRadius: '50%',
      padding: '2px 6px',
      fontSize: '0.75rem',
      marginLeft: 'auto'
    },
    main: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'background.default'
    },
    messageHeader: {
      padding: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      borderBottom: '1px solid',
      borderColor: 'divider'
    },
    messageContainer: {
      flex: 1,
      overflowY: 'auto',
      padding: 2
    },
    message: {
      display: 'flex',
      marginBottom: 2
    },
    messageContent: {
      marginLeft: 1.5,
      flex: 1
    },
    messageAuthorLine: {
      display: 'flex',
      alignItems: 'center',
      gap: 1
    },
    messageInput: {
      padding: 2,
      borderTop: '1px solid',
      borderColor: 'divider'
    },
    mention: {
      color: 'primary.main',
      fontWeight: 500,
      backgroundColor: 'primary.light',
      padding: '2px 4px',
      borderRadius: 0.5,
      marginRight: 0.5
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Agora</Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Welcome to Agora, the collaboration space for Nexa Agents. Chat with agents and team members in real-time.
      </Alert>
      
      {/* Connection status */}
      {!connected && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Not connected to server. Messages will be stored locally until connection is restored.
        </Alert>
      )}
      
      {/* Chat interface */}
      <Paper sx={styles.container}>
        {/* Channels Sidebar */}
        <Box sx={styles.sidebar}>
          <Box sx={styles.sidebarHeader}>
            <Typography variant="subtitle1">Channels</Typography>
            <IconButton size="small">
              <Add fontSize="small" />
            </IconButton>
          </Box>
          
          <Box sx={styles.channelList}>
            {channels.map(channel => (
              <Box 
                key={channel.id}
                sx={{
                  ...styles.channelItem,
                  ...(selectedChannel === channel.id ? { 
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText'
                  } : {})
                }}
                onClick={() => handleChannelSelect(channel.id)}
              >
                <Tag fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="body2">{channel.name}</Typography>
                {channel.unread > 0 && (
                  <Box component="span" sx={styles.unreadBadge}>
                    {channel.unread}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Main Chat Area */}
        <Box sx={styles.main}>
          <Box sx={styles.messageHeader}>
            <Tag fontSize="small" />
            <Typography variant="subtitle1">#{selectedChannel}</Typography>
          </Box>

          <Box sx={styles.messageContainer}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              messages
                .filter(msg => !msg.channel || msg.channel === selectedChannel)
                .map(message => (
                <Box key={message.id} sx={styles.message}>
                  <Avatar src={message.avatar} sx={{ width: 32, height: 32 }} />
                  <Box sx={styles.messageContent}>
                    <Box sx={styles.messageAuthorLine}>
                      <Typography variant="body2" fontWeight="500">
                        {message.author}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {message.timestamp}
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {message.content.split(' ').map((word, i) => {
                        if (word.startsWith('@')) {
                          const username = word.substring(1);
                          const isValidMention = agents.some(a => a.name === username);
                          
                          if (isValidMention) {
                            return (
                              <Chip
                                key={i}
                                label={word}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ mr: 0.5 }}
                              />
                            );
                          }
                        }
                        return <span key={i}>{word} </span>;
                      })}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Box>

          <Box sx={styles.messageInput}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder={`Message #${selectedChannel}`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              InputProps={{
                endAdornment: (
                  <IconButton 
                    size="small"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send fontSize="small" />
                  </IconButton>
                )
              }}
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
