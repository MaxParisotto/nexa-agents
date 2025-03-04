import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch, shallowEqual } from 'react-redux';
import ErrorBoundary from '../ErrorBoundary';
import { createSelector } from '@reduxjs/toolkit';
import { Send, Tag, Add } from '@mui/icons-material';
import { TextField, IconButton, Avatar, Typography } from '@mui/material';

// Create memoized selectors outside the component
const selectAgoraData = createSelector(
  state => state?.agora?.data || [],
  data => data || []
);

const selectAgoraLoading = createSelector(
  state => state.agora.loading,
  loading => loading
);

const selectAgoraState = state => state.agora || { selected: [], selected2: [] };

// Create stable selectors with createSelector
const selectSelectedItems = createSelector(
  [selectAgoraState],
  (agoraState) => agoraState.selected || []
);

const selectAdditionalItems = createSelector(
  [selectAgoraState],
  (agoraState) => agoraState.selected2 || []
);

const selectAgents = state => state.agents?.active || [];

const Agora = () => {
  // Use memoized selectors
  const agoraData = useSelector(selectAgoraData);
  const isLoading = useSelector(selectAgoraLoading);
  const dispatch = useDispatch();

  // Use selectors with proper equality comparisons
  const selected = useSelector(selectSelectedItems, shallowEqual);
  const selected2 = useSelector(selectAdditionalItems, shallowEqual);
  
  // Memoize this derived data
  const processedItems = useMemo(() => {
    return selected.map(item => ({
      ...item,
      processed: true
    }));
  }, [selected]);

  // Use memoized selector for agents
  const agents = useSelector(selectAgents, shallowEqual);

  const [selectedChannel, setSelectedChannel] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [channels] = useState([
    { id: 'general', name: 'general', unread: 2 },
    { id: 'agents', name: 'agents', unread: 0 },
    { id: 'system', name: 'system', unread: 5 }
  ]);

  useEffect(() => {
    // Initial system message
    setMessages([{
      id: 1,
      author: 'Nexa System',
      content: 'Welcome to Agora collaboration space!',
      timestamp: new Date().toLocaleTimeString(),
      avatar: '/static/images/avatar/system.png'
    }]);
  }, []);

  // Memoize the message handling function 
  const handleSendMessage = useCallback(() => {
    if (newMessage.trim()) {
      const mentions = [];
      const content = newMessage.replace(/@(\w+)/g, (match, username) => {
        const agent = agents.find(a => a.name === username);
        if (agent) {
          mentions.push(agent.id);
          return `@${username}`;
        }
        return match;
      });

      setMessages(prev => [...prev, {
        id: prev.length + 1,
        author: 'You',
        content,
        mentions,
        timestamp: new Date().toLocaleTimeString(),
        avatar: '/static/images/avatar/user.png'
      }]);
      setNewMessage('');
    }
  }, [newMessage, agents]);

  return (
    <div className="agora-container">
      {/* Channels Sidebar */}
      <div className="agora-sidebar">
        <div className="sidebar-header">
          <Typography variant="h6">Nexa Channels</Typography>
          <IconButton size="small">
            <Add fontSize="small" />
          </IconButton>
        </div>
        
        <div className="channel-list">
          {channels.map(channel => (
            <div 
              key={channel.id}
              className={`channel-item ${selectedChannel === channel.id ? 'active' : ''}`}
              onClick={() => setSelectedChannel(channel.id)}
            >
              <Tag fontSize="small" />
              <Typography variant="body2">{channel.name}</Typography>
              {channel.unread > 0 && (
                <span className="unread-badge">{channel.unread}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="agora-main">
        <div className="message-header">
          <Tag fontSize="small" />
          <Typography variant="subtitle1">{selectedChannel}</Typography>
        </div>

        <div className="message-container">
          {messages.map(message => (
            <div key={message.id} className="message">
              <Avatar src={message.avatar} sx={{ width: 32, height: 32 }} />
              <div className="message-content">
                <div className="message-header">
                  <Typography variant="body2" fontWeight="500">
                    {message.author}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {message.timestamp}
                  </Typography>
                </div>
                <Typography variant="body2">
                  {message.content.split(' ').map((word, i) => (
                    message.mentions?.some(mention => word === `@${agents.find(a => a.id === mention)?.name}`) ? (
                      <span key={i} className="mention" style={{ 
                        color: '#1976d2',
                        fontWeight: 500,
                        backgroundColor: '#1976d210',
                        padding: '2px 4px',
                        borderRadius: 4
                      }}>
                        {word}
                      </span>
                    ) : (
                      <span key={i}>{word} </span>
                    )
                  ))}
                </Typography>
              </div>
            </div>
          ))}
        </div>

        <div className="message-input">
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
        </div>
      </div>
    </div>
  );
};

export default () => 
  <ErrorBoundary>
    <Agora />
  </ErrorBoundary>
;
