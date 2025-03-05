import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Paper, TextField, IconButton, Avatar, 
  Divider, CircularProgress, Alert, Chip, Popover, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Link } from '@mui/material';
import { Send, Tag, Add, Notifications as NotificationsIcon, DeleteOutline, AttachFile } from '@mui/icons-material';
import { useSettings } from '../../contexts/SettingsContext';
import { apiService } from '../../services/api';
import { useSocket } from '../../services/socket.jsx';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Constants for storage keys
const STORAGE_KEYS = {
  MESSAGES: 'agora_messages',
  CHANNELS: 'agora_channels',
  NOTIFICATIONS: 'agora_notifications'
};

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
    { id: 'general', name: 'general', unread: 0, description: 'General discussion' },
    { id: 'agents', name: 'agents', unread: 0, description: 'Agent coordination' },
    { id: 'system', name: 'system', unread: 0, description: 'System notifications' }
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
  const [showAddChannelDialog, setShowAddChannelDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  // Fetch users and agents on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [agentsResponse, usersResponse] = await Promise.all([
          apiService.getAgents(),
          apiService.getUsers()
        ]);
        
        // Add Project Manager first
        const projectManager = {
          id: 'agent-project-manager',
          name: 'Project Manager',
          type: 'agent',
          displayName: 'Project Manager',
          avatar: '/static/images/avatar/agent.png',
          isProjectManager: true
        };

        const allUsers = [
          projectManager, // Add Project Manager first
          ...(agentsResponse?.data || [])
            .filter(agent => agent.id !== 'agent-project-manager') // Filter out any duplicate Project Manager
            .map(agent => ({
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

  // Load persisted data on component mount
  useEffect(() => {
    const loadPersistedData = () => {
      try {
        // Load messages
        const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
        if (savedMessages) {
          setMessages(JSON.parse(savedMessages));
        } else {
          // Set initial welcome message if no saved messages
          setMessages([{
            id: 'system-welcome',
            author: 'Nexa System',
            content: 'Welcome to Agora collaboration space! You can mention @Project Manager for assistance.',
            timestamp: new Date().toLocaleTimeString(),
            avatar: '/static/images/avatar/system.png'
          }]);
        }

        // Load channels
        const savedChannels = localStorage.getItem(STORAGE_KEYS.CHANNELS);
        if (savedChannels) {
          setChannels(JSON.parse(savedChannels));
        }

        // Load notifications
        const savedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        if (savedNotifications) {
          setNotifications(JSON.parse(savedNotifications));
        }
      } catch (error) {
        console.error('Error loading persisted data:', error);
      }
    };

    loadPersistedData();
  }, []);

  // Persist messages whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch (error) {
      console.error('Error persisting messages:', error);
    }
  }, [messages]);

  // Persist channels whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(channels));
    } catch (error) {
      console.error('Error persisting channels:', error);
    }
  }, [channels]);

  // Persist notifications whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error persisting notifications:', error);
    }
  }, [notifications]);

  // Update socket event listeners to handle message synchronization
  useEffect(() => {
    if (!socket) return;

    // Listen for new messages
    const handleNewMessage = (data) => {
      // Check if message already exists to prevent duplicates
      setMessages(prev => {
        if (!prev.some(msg => msg.id === data.messageId)) {
          const newMessage = {
            id: data.messageId || `msg-${Date.now()}`,
            author: data.author || 'Unknown',
            content: data.content,
            mentions: data.mentions || [],
            timestamp: new Date().toLocaleTimeString(),
            avatar: data.avatar || '/static/images/avatar/default.png',
            channel: data.channel
          };
          return [...prev, newMessage];
        }
        return prev;
      });

      // Update unread count if not in the current channel
      if (data.channel && data.channel !== selectedChannel) {
        setChannels(prev => prev.map(channel => 
          channel.id === data.channel 
            ? { ...channel, unread: channel.unread + 1 } 
            : channel
        ));
      }
    };

    // Handle message synchronization on reconnect
    const handleReconnect = () => {
      console.log('Socket reconnected, syncing messages...');
      socket.emit('sync_messages', {
        lastMessageId: messages.length > 0 ? messages[messages.length - 1].id : null
      });
    };

    // Handle sync response
    const handleSync = (data) => {
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(prev => {
          const newMessages = data.messages.filter(
            newMsg => !prev.some(existingMsg => existingMsg.id === newMsg.id)
          );
          return [...prev, ...newMessages];
        });
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('connect', handleReconnect);
    socket.on('sync_messages', handleSync);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('connect', handleReconnect);
      socket.off('sync_messages', handleSync);
    };
  }, [socket, selectedChannel, messages]);

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
      console.log('Identifying user:', {
        userId: settings.user.id,
        userName: settings.user.name,
        userType: 'user',
        avatar: settings.user.avatar
      });
      
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

  // Add channel management functions
  const handleAddChannel = () => {
    if (newChannelName.trim()) {
      const channelId = newChannelName.toLowerCase().replace(/\s+/g, '-');
      setChannels(prev => [
        ...prev,
        {
          id: channelId,
          name: newChannelName.trim(),
          unread: 0,
          description: `Channel for ${newChannelName} discussions`
        }
      ]);
      setNewChannelName('');
      setShowAddChannelDialog(false);
    }
  };

  const handleDeleteChannel = (channelId) => {
    if (channelId === 'general' || channelId === 'agents' || channelId === 'system') {
      return; // Prevent deletion of default channels
    }
    setChannels(prev => prev.filter(channel => channel.id !== channelId));
    if (selectedChannel === channelId) {
      setSelectedChannel('general');
    }
  };

  // Handle agent responses with messageId tracking and prevent duplicates
  useEffect(() => {
    if (!socket) return;

    const processedMessageIds = new Set();

    const handleAgentResponse = (data) => {
      console.log('Agent response received:', data);
      
      // Skip if we've already processed this message
      if (processedMessageIds.has(data.messageId)) {
        console.log('Skipping duplicate message:', data.messageId);
        return;
      }
      
      // Add to processed messages
      processedMessageIds.add(data.messageId);
      
      // Remove typing indicator if present
      setMessages(prev => prev.filter(msg => 
        msg.id !== 'typing-' + data.agentId
      ));
      
      // Add agent's response
      setMessages(prev => [...prev, {
        id: data.messageId || `agent-${Date.now()}`,
        author: data.agentName || 'Agent',
        content: data.message,
        timestamp: new Date().toLocaleTimeString(),
        avatar: data.avatar || '/static/images/avatar/agent.png',
        isAgentResponse: true,
        channel: data.channel
      }]);
    };

    const handleProjectManagerMessage = (data) => {
      console.log('Project Manager message received:', data);
      
      // Skip if we've already processed this message
      if (processedMessageIds.has(data.messageId)) {
        console.log('Skipping duplicate message:', data.messageId);
        return;
      }
      
      // Remove typing indicator if present
      setMessages(prev => prev.filter(msg => 
        !msg.id.startsWith('typing-project-manager-')
      ));
      
      // Add to processed messages
      processedMessageIds.add(data.messageId);
      
      // Add Project Manager's response
      setMessages(prev => [...prev, {
        id: data.messageId || `pm-${Date.now()}`,
        author: 'Project Manager',
        content: data.content,
        timestamp: new Date().toLocaleTimeString(),
        avatar: '/static/images/avatar/agent.png',
        isAgentResponse: true,
        channel: data.channel,
        isError: data.isError
      }]);
    };

    const handleRemoveTypingIndicator = (data) => {
      setMessages(prev => prev.filter(msg => msg.id !== data.id));
    };

    // Add event listeners
    socket.on('agent_response', handleAgentResponse);
    socket.on('project-manager-message', handleProjectManagerMessage);
    socket.on('remove_typing_indicator', handleRemoveTypingIndicator);

    // Cleanup
    return () => {
      socket.off('agent_response', handleAgentResponse);
      socket.off('project-manager-message', handleProjectManagerMessage);
      socket.off('remove_typing_indicator', handleRemoveTypingIndicator);
    };
  }, [socket]);

  // Message display with enhanced formatting
  const renderMessage = (message) => {
    // Function to format message content with code blocks and commands
    const formatMessageContent = (content) => {
      if (message.isTyping) {
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            <span>Thinking...</span>
          </Box>
        );
      }

      // Check if this is a command message
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

      // Try to parse JSON response
      try {
        // Check if the content looks like a JSON string
        if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
          const jsonData = JSON.parse(content);
          return (
            <Box sx={{ width: '100%' }}>
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
                {JSON.stringify(jsonData, null, 2)}
              </Box>
            </Box>
          );
        }
      } catch (e) {
        // Not JSON or invalid JSON, continue with normal formatting
      }

      // Handle code blocks with syntax highlighting
      const parts = content.split(/(```[\s\S]*?```)/g);
      return parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const [, language, ...codeParts] = part.split('\n');
          const code = codeParts.slice(0, -1).join('\n');
          const lang = language?.trim() || '';
          
          return (
            <Box key={index} sx={{ my: 2 }}>
              {lang && (
                <Typography variant="caption" sx={{ 
                  display: 'block',
                  color: 'text.secondary',
                  mb: 0.5
                }}>
                  {lang}
                </Typography>
              )}
              <SyntaxHighlighter
                language={lang || 'plaintext'}
                style={materialDark}
                customStyle={{
                  margin: 0,
                  borderRadius: '4px',
                  maxHeight: '400px'
                }}
              >
                {code}
              </SyntaxHighlighter>
            </Box>
          );
        }

        // Handle mentions and regular text
        return (
          <Typography key={index} variant="body2" component="span">
            {part.split(' ').map((word, i) => {
              const isMention = message.mentions?.some(mention => 
                word === `@${users.find(u => u.id === mention.id)?.displayName}`
              );
              
              return isMention ? (
                <span key={i} style={styles.mention}>
                  {word}{' '}
                </span>
              ) : (
                <span key={i}>{word}{' '}</span>
              );
            })}
          </Typography>
        );
      });
    };

    return (
      <Box sx={{
        display: 'flex',
        gap: 2,
        p: 2,
        '&:hover': {
          backgroundColor: 'action.hover'
        }
      }}>
        <Avatar src={message.avatar} sx={{ width: 32, height: 32 }} />
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {message.author}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {message.timestamp}
            </Typography>
            {message.isError && (
              <Chip
                label="Error"
                size="small"
                color="error"
                variant="outlined"
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <Box sx={{ wordBreak: 'break-word' }}>
            {formatMessageContent(message.content)}
          </Box>
          {message.attachments && message.attachments.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {message.attachments.map((attachment, index) => (
                <Chip
                  key={index}
                  label={attachment.name}
                  variant="outlined"
                  size="small"
                  onClick={() => window.open(attachment.url)}
                  icon={<AttachFile fontSize="small" />}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // Handle sending messages with improved mention handling and messageId
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !socket) return;

    try {
      setLoading(true);
      const messageId = `msg-${Date.now()}`;

      // Process message content for code blocks and formatting
      const processedContent = newMessage.replace(/\`\`\`(\w+)?\n([\s\S]+?)\`\`\`/g, (_, lang, code) => {
        return `\`\`\`${lang || ''}\n${code.trim()}\n\`\`\``;
      });

      // Add the message to local state first
      const localMessage = {
        id: messageId,
        author: settings?.user?.name || 'You',
        content: processedContent,
        timestamp: new Date().toLocaleTimeString(),
        avatar: settings?.user?.avatar || '/static/images/avatar/user.png',
        channel: selectedChannel
      };
      
      // Update messages state immediately
      setMessages(prev => [...prev, localMessage]);

      // Check for Project Manager mention
      const hasPMMention = processedContent.toLowerCase().includes('@project manager');
      const projectManager = users.find(u => u.isProjectManager);

      if (hasPMMention && projectManager) {
        console.log('Project Manager mentioned:', processedContent);
        
        // Add typing indicator with unique ID
        const typingId = `typing-project-manager-${messageId}`;
        setMessages(prev => [...prev, {
          id: typingId,
          author: 'Project Manager',
          content: '...',
          timestamp: new Date().toLocaleTimeString(),
          avatar: '/static/images/avatar/agent.png',
          isTyping: true,
          channel: selectedChannel
        }]);

        // Emit the message to the Project Manager
        socket.emit('project-manager-request', {
          message: processedContent,
          timestamp: new Date().toISOString(),
          channel: selectedChannel,
          messageId
        });
      }

      // Emit the message to all users
      socket.emit('new_message', {
        content: processedContent,
        channel: selectedChannel,
        mentions: extractMentions(processedContent),
        timestamp: new Date().toISOString(),
        author: settings?.user?.name || 'You',
        avatar: settings?.user?.avatar || '/static/images/avatar/user.png',
        messageId
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  }, [newMessage, socket, selectedChannel, users, settings?.user]);

  // Helper function to extract mentions
  const extractMentions = (text) => {
    const mentions = [];
    const regex = /@(\w+)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      const mentionedName = match[1];
      const user = users.find(u => 
        u.displayName.toLowerCase() === mentionedName.toLowerCase() ||
        (mentionedName.toLowerCase() === 'project' && 
         u.displayName.toLowerCase().includes('project manager'))
      );
      
      if (user) {
        mentions.push({
          id: user.id,
          name: user.displayName,
          type: user.type
        });
      }
    }
    
    return mentions;
  };

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
            <IconButton size="small" onClick={() => setShowAddChannelDialog(true)}>
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
                    } : {}),
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      flex: 1,
                      cursor: 'pointer'
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
                  </Box>
                  {/* Add delete button for non-default channels */}
                  {!['general', 'agents', 'system'].includes(channel.id) && (
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChannel(channel.id);
                      }}
                      sx={{ 
                        opacity: 0,
                        '&:hover': { opacity: 1 },
                        ...(selectedChannel === channel.id ? { color: 'primary.contrastText' } : {})
                      }}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
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
                .map(message => renderMessage(message))
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

      {/* Add Channel Dialog */}
      <Dialog 
        open={showAddChannelDialog} 
        onClose={() => setShowAddChannelDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Channel</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Channel Name"
            fullWidth
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            helperText="Enter a name for the new channel"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddChannelDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddChannel}
            disabled={!newChannelName.trim()}
            variant="contained"
          >
            Add Channel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
