import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Send, Tag, Add } from '@mui/icons-material';
import { TextField, IconButton, Avatar, Typography } from '@mui/material';

const Agora = () => {
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [channels] = useState([
    { id: 'general', name: 'general', unread: 2 },
    { id: 'agents', name: 'agents', unread: 0 },
    { id: 'system', name: 'system', unread: 5 }
  ]);

  const agents = useSelector(state => 
    (state.agents?.active || []).filter(agent => agent !== null)
  );

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

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        author: 'You',
        content: newMessage,
        timestamp: new Date().toLocaleTimeString(),
        avatar: '/static/images/avatar/user.png'
      }]);
      setNewMessage('');
    }
  };

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
                <Typography variant="body2">{message.content}</Typography>
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

export default Agora;
