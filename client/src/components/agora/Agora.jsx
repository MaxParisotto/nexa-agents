import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Grid, Button, TextField, CircularProgress,
  Card, CardContent, Divider, Avatar, Chip, IconButton,
  List, ListItem, ListItemText, ListItemAvatar, Toolbar,
  Alert, Menu, MenuItem, InputAdornment, Container
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChatIcon from '@mui/icons-material/Chat';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import ForumIcon from '@mui/icons-material/Forum';
import ReplyIcon from '@mui/icons-material/Reply';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import AddIcon from '@mui/icons-material/Add';

import { formatDate } from '../../shared/utils';

/**
 * Agora Component - Discord-like discussion forum for human agents
 */
export default function Agora() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeChannel, setActiveChannel] = useState('general');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        // Mock channels
        const mockChannels = [
          { id: 'general', name: 'General', unread: 0, participants: 32 },
          { id: 'workflows', name: 'Workflow Collaboration', unread: 5, participants: 18 },
          { id: 'research', name: 'Research Discussion', unread: 2, participants: 12 },
          { id: 'support', name: 'Agent Support', unread: 0, participants: 24 },
          { id: 'showcase', name: 'Project Showcase', unread: 9, participants: 30 }
        ];
        
        setChannels(mockChannels);
        
        // Mock messages for the active channel
        fetchChannelMessages(activeChannel);
        
        setError(null);
      } catch (err) {
        console.error('Error fetching Agora data:', err);
        setError('Failed to load discussion forum. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Fetch messages when channel changes
  useEffect(() => {
    if (!loading) {
      fetchChannelMessages(activeChannel);
    }
  }, [activeChannel]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const fetchChannelMessages = async (channelId) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Generate between 10-25 mock messages
      const count = Math.floor(Math.random() * 15) + 10;
      const mockMessages = [];
      const now = new Date();
      const users = [
        { id: 'user1', name: 'John Doe', avatar: 'J', color: '#4a76a8' },
        { id: 'user2', name: 'Alice Smith', avatar: 'A', color: '#e57373' },
        { id: 'user3', name: 'Bob Miller', avatar: 'B', color: '#43a047' },
        { id: 'user4', name: 'Emma Wilson', avatar: 'E', color: '#ff9800' },
        { id: 'user5', name: 'Michael Brown', avatar: 'M', color: '#9c27b0' }
      ];
      
      for (let i = 0; i < count; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const timeOffset = (count - i) * (Math.random() * 10 + 5) * 60000; // Random minutes ago
        mockMessages.push({
          id: `msg-${channelId}-${i}`,
          channelId,
          user,
          content: `This is a sample message in the ${channelId} channel. It contains some discussion text that might be relevant to the channel topic.`,
          timestamp: new Date(now - timeOffset),
          reactions: Math.random() > 0.7 ? [
            { emoji: '👍', count: Math.floor(Math.random() * 5) + 1 },
            { emoji: '❤️', count: Math.floor(Math.random() * 3) }
          ] : [],
          attachments: Math.random() > 0.9 ? [
            { name: 'document.pdf', size: '2.4 MB', type: 'application/pdf' }
          ] : []
        });
      }
      
      // Sort by timestamp
      mockMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(mockMessages);
    } catch (err) {
      console.error(`Error fetching messages for channel ${channelId}:`, err);
      setError(`Failed to load messages for ${channelId}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle channel selection
  const handleChannelChange = (channelId) => {
    setActiveChannel(channelId);
  };

  // Handle search input
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle message input
  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };
  
  // Handle message send
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    const newMessage = {
      id: `msg-new-${Date.now()}`,
      channelId: activeChannel,
      user: { id: 'currentUser', name: 'Current User', avatar: 'U', color: '#2196f3' },
      content: message,
      timestamp: new Date(),
      reactions: [],
      attachments: []
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessage('');
  };
  
  // Handle key press in message input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle message menu open
  const handleMenuOpen = (event, message) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMessage(message);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMessage(null);
  };

  // Handle message menu actions
  const handleMenuAction = (action) => {
    if (!selectedMessage) return;

    console.log(`Action: ${action} for message ID: ${selectedMessage.id}`);
    handleMenuClose();
  };
  
  // Scroll to bottom of message list
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Filter channels based on search term
  const filteredChannels = channels.filter(channel => 
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header section that properly takes up full width */}
      <Toolbar disableGutters sx={{ width: '100%', display: 'block', p: 0, mb: 3 }}>
        <Typography variant="h4">Agora</Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
          Collaborate and discuss with other human agents
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Toolbar>
      
      {/* Content area with chat UI */}
      <Box sx={{ display: 'flex', width: '100%' }}>
        <Grid container spacing={2}>
          {/* Left sidebar - channels */}
          <Grid item xs={12} md={3}>
            <Paper sx={{ height: '75vh', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search channels..."
                  value={searchTerm}
                  onChange={handleSearch}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                  }}
                />
              </Box>
              
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight="bold">Channels</Typography>
                <IconButton size="small">
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
              
              <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <List>
                  {loading && !channels.length ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : filteredChannels.length > 0 ? (
                    filteredChannels.map(channel => (
                      <ListItem 
                        key={channel.id} 
                        component="div" 
                        selected={activeChannel === channel.id}
                        onClick={() => handleChannelChange(channel.id)}
                        sx={{ 
                          borderRadius: 1, 
                          mx: 0.5,
                          cursor: 'pointer',
                          fontWeight: channel.unread > 0 ? 'bold' : 'normal' 
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 40 }}>
                          <ForumIcon color={activeChannel === channel.id ? 'primary' : 'inherit'} />
                        </ListItemAvatar>
                        <ListItemText 
                          primary={channel.name} 
                          secondary={`${channel.participants} participants`}
                        />
                        {channel.unread > 0 && (
                          <Chip 
                            label={channel.unread} 
                            color="primary" 
                            size="small" 
                            sx={{ height: 20, minWidth: 20 }}
                          />
                        )}
                      </ListItem>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemText primary="No channels found" />
                    </ListItem>
                  )}
                </List>
              </Box>
            </Paper>
          </Grid>
          
          {/* Main Content - Messages */}
          <Grid item xs={12} md={9}>
            <Paper sx={{ height: '75vh', display: 'flex', flexDirection: 'column' }}>
              {/* Channel Header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6" component="div">
                  #{channels.find(c => c.id === activeChannel)?.name || activeChannel}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {channels.find(c => c.id === activeChannel)?.participants || 0} participants
                </Typography>
              </Box>
              
              {/* Messages Container */}
              <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : messages.length > 0 ? (
                  <List>
                    {messages.map((msg, index) => {
                      const isNewUser = index === 0 || messages[index-1].user.id !== msg.user.id;
                      const showTimestamp = isNewUser || 
                        new Date(msg.timestamp) - new Date(messages[index-1].timestamp) > 10 * 60 * 1000; // 10 minutes
                        
                      return (
                        <React.Fragment key={msg.id}>
                          {showTimestamp && (
                            <Box sx={{ textAlign: 'center', my: 2 }}>
                              <Typography variant="caption" color="textSecondary">
                                {formatDate(msg.timestamp)}
                              </Typography>
                            </Box>
                          )}
                          
                          <ListItem 
                            alignItems="flex-start" 
                            sx={{ 
                              py: isNewUser ? 1 : 0.5, 
                              px: 1,
                              "&:hover": { 
                                bgcolor: 'action.hover',
                                "& .message-actions": {
                                  visibility: 'visible'
                                }
                              }
                            }}
                          >
                            {isNewUser && (
                              <ListItemAvatar>
                                <Avatar sx={{ bgcolor: msg.user.color }}>
                                  {msg.user.avatar}
                                </Avatar>
                              </ListItemAvatar>
                            )}
                            
                            <Box sx={{ ml: isNewUser ? 0 : 7 }}>
                              {isNewUser && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                  <Typography variant="subtitle2" fontWeight="bold">
                                    {msg.user.name}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                                    {formatDate(msg.timestamp, { hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                </Box>
                              )}
                              
                              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                                  {msg.content}
                                </Typography>
                                
                                <Box 
                                  className="message-actions"
                                  sx={{ 
                                    ml: 1, 
                                    visibility: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  <IconButton 
                                    size="small"
                                    onClick={(e) => handleMenuOpen(e, msg)}
                                  >
                                    <MoreVertIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small">
                                    <ReplyIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton size="small">
                                    <EmojiEmotionsIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </Box>
                              
                              {msg.attachments.length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  {msg.attachments.map((attachment, i) => (
                                    <Chip
                                      key={i}
                                      icon={<AttachFileIcon />}
                                      label={`${attachment.name} (${attachment.size})`}
                                      variant="outlined"
                                      size="small"
                                      sx={{ mr: 1 }}
                                    />
                                  ))}
                                </Box>
                              )}
                              
                              {msg.reactions.length > 0 && (
                                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                                  {msg.reactions.map((reaction, i) => (
                                    <Chip
                                      key={i}
                                      label={`${reaction.emoji} ${reaction.count}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ px: 0.5, height: 24 }}
                                    />
                                  ))}
                                </Box>
                              )}
                            </Box>
                          </ListItem>
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </List>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <Typography color="textSecondary">
                      No messages in this channel. Be the first to send a message!
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {/* Message Input */}
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder={`Message #${channels.find(c => c.id === activeChannel)?.name || activeChannel}`}
                    value={message}
                    onChange={handleMessageChange}
                    onKeyPress={handleKeyPress}
                    sx={{ mr: 1 }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small">
                            <AttachFileIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small">
                            <EmojiEmotionsIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                  <Button 
                    variant="contained" 
                    color="primary"
                    endIcon={<SendIcon />}
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                  >
                    Send
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
      
      {/* Message action menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleMenuAction('reply')}>Reply</MenuItem>
        <MenuItem onClick={() => handleMenuAction('copy')}>Copy Text</MenuItem>
        <MenuItem onClick={() => handleMenuAction('report')}>Report Message</MenuItem>
      </Menu>
    </Box>
  );
}
