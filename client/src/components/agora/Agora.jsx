import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, TextField, IconButton, Avatar, 
  Divider, CircularProgress, Alert, Chip, Popover, Button
} from '@mui/material';

import { Send, Tag, Add, Notifications as NotificationsIcon } from '@mui/icons-material';
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
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionAnchorEl, setMentionAnchorEl] = useState(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [users, setUsers] = useState([]);
  const textFieldRef = useRef(null);
  const [notifications, setNotifications] = useState([]);

  // Fetch users and agents on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [agentsResponse, usersResponse] = await Promise.all([
          apiService.getAgents(),
          apiService.getUsers()
        ]);
        
        const allUsers = [
          ...(agentsResponse?.data || []).map(agent => ({
            ...agent,
            type: 'agent',
            displayName: agent.name,
            avatar: agent.avatar || '/static/images/avatar/agent.png'
          })),
          ...(usersResponse?.data || []).map(user => ({
            ...user,
            type: 'user',
            displayName: user.name,
            avatar: user.avatar || '/static/images/avatar/user.png'
          }))
        ];
        
        setUsers(allUsers);
        setAgents(agentsResponse?.data || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    fetchUsers();
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

  // Handle mention notifications
  useEffect(() => {
    if (!socket) return;
    
    const handleMentionNotification = (data) => {
      const { message, channel, from, timestamp } = data;
      
      // Add to notifications
      setNotifications(prev => [...prev, {
        id: Date.now(),
        message,
        channel,
        from,
        timestamp,
        read: false
      }]);
      
      // Update channel unread count
      setChannels(prev => prev.map(ch => 
        ch.id === channel 
          ? { ...ch, unread: ch.unread + 1 }
          : ch
      ));
    };
    
    socket.on('mention_notification', handleMentionNotification);
    
    return () => {
      socket.off('mention_notification', handleMentionNotification);
    };
  }, [socket]);
  
  // Identify user on connection
  useEffect(() => {
    if (socket && connected && settings?.user) {
      socket.emit('identify', {
        userId: settings.user.id,
        userName: settings.user.name,
        userType: 'user',
        avatar: settings.user.avatar
      });
    }
  }, [socket, connected, settings?.user]);

  // Handle mention suggestions
  const handleMentionInput = (event) => {
    const text = event.target.value;
    const cursorPos = event.target.selectionStart;
    setCursorPosition(cursorPos);
    
    // Find the word being typed
    const beforeCursor = text.slice(0, cursorPos);
    const match = beforeCursor.match(/@(\w*)$/);
    
    if (match) {
      const searchTerm = match[1].toLowerCase();
      const suggestions = users.filter(user => 
        user.displayName.toLowerCase().includes(searchTerm)
      ).slice(0, 5); // Limit to 5 suggestions
      
      setMentionSuggestions(suggestions);
      setShowMentionSuggestions(true);
      setMentionAnchorEl(event.target);
    } else {
      setShowMentionSuggestions(false);
    }
    
    setNewMessage(text);
  };

  // Handle mention selection
  const handleMentionSelect = (user) => {
    const text = newMessage;
    const beforeCursor = text.slice(0, cursorPosition);
    const afterCursor = text.slice(cursorPosition);
    const mentionStart = beforeCursor.lastIndexOf('@');
    
    const newText = 
      beforeCursor.slice(0, mentionStart) + 
      `@${user.displayName} ` + 
      afterCursor;
    
    setNewMessage(newText);
    setShowMentionSuggestions(false);
    
    // Focus back on input
    if (textFieldRef.current) {
      textFieldRef.current.focus();
    }
  };

  // Enhanced message sending with mention handling
  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    
    // Extract all mentions
    while ((match = mentionRegex.exec(newMessage)) !== null) {
      const mentionedName = match[1];
      const mentionedUser = users.find(u => u.displayName === mentionedName);
      if (mentionedUser) {
        mentions.push({
          id: mentionedUser.id,
          type: mentionedUser.type,
          name: mentionedUser.displayName
        });
      }
    }

    // Add message to local state
    const message = {
      id: messages.length + 1,
      author: 'You',
      content: newMessage,
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
        content: newMessage,
        mentions,
        channel: selectedChannel
      });
      
      // Send notifications for mentions
      mentions.forEach(mention => {
        socket.emit('mention_notification', {
          mentionedId: mention.id,
          mentionedType: mention.type,
          message: newMessage,
          channel: selectedChannel
        });
      });
    }
  }, [newMessage, users, messages.length, selectedChannel, socket, connected]);

  // Handle channel selection
  const handleChannelSelect = (channelId) => {
    setSelectedChannel(channelId);
    
    // Mark channel as read
    setChannels(prev => prev.map(channel => 
      channel.id === channelId ? { ...channel, unread: 0 } : channel
    ));
  };

  // Add notification badge to channel list
  const getChannelNotifications = (channelId) => {
    return notifications.filter(n => 
      n.channel === channelId && !n.read
    ).length;
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
      
      {/* Add notifications indicator in the header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Alert severity="info" sx={{ flex: 1 }}>
          Welcome to Agora, the collaboration space for Nexa Agents. Chat with agents and team members in real-time.
        </Alert>
        {notifications.filter(n => !n.read).length > 0 && (
          <Chip
            icon={<NotificationsIcon />}
            label={`${notifications.filter(n => !n.read).length} new mentions`}
            color="primary"
            variant="outlined"
            onClick={() => {
              // Mark all notifications as read
              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            }}
          />
        )}
      </Box>
      
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
            {channels.map(channel => {
              const notificationCount = getChannelNotifications(channel.id);
              const totalCount = channel.unread + notificationCount;
              
              return (
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
                  {totalCount > 0 && (
                    <Box component="span" sx={styles.unreadBadge}>
                      {totalCount}
                    </Box>
                  )}
                  {notificationCount > 0 && (
                    <Box
                      component="span"
                      sx={{
                        ...styles.unreadBadge,
                        ml: 0.5,
                        bgcolor: 'warning.main'
                      }}
                    >
                      @{notificationCount}
                    </Box>
                  )}
                </Box>
              );
            })}
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
              ref={textFieldRef}
              fullWidth
              variant="outlined"
              size="small"
              placeholder={`Message #${selectedChannel}`}
              value={newMessage}
              onChange={handleMentionInput}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
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
            
            {/* Mention suggestions popover */}
            <Popover
              open={showMentionSuggestions && mentionSuggestions.length > 0}
              anchorEl={mentionAnchorEl}
              onClose={() => setShowMentionSuggestions(false)}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
            >
              <Paper sx={{ p: 1, maxWidth: 300 }}>
                {mentionSuggestions.map((user) => (
                  <Box
                    key={user.id}
                    sx={{
                      p: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => handleMentionSelect(user)}
                  >
                    <Avatar
                      src={user.avatar}
                      sx={{ width: 24, height: 24 }}
                    />
                    <Typography variant="body2">
                      {user.displayName}
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{ ml: 1, color: 'text.secondary' }}
                      >
                        {user.type}
                      </Typography>
                    </Typography>
                  </Box>
                ))}
              </Paper>
            </Popover>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
