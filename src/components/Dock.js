import React, { useState, useEffect } from 'react';
import { Box, Paper, Tooltip, IconButton } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Dashboard as DashboardIcon, 
  SmartToy as AgentsIcon,
  Assignment as TasksIcon,
  Timeline as MetricsIcon,
  Assessment as LogsIcon,
  Settings as SettingsIcon,
  Chat as ChatIcon
} from '@mui/icons-material';

/**
 * Dock component that displays a macOS-style dock at the bottom of the screen
 * Provides access to main app sections with animated icons
 */
const Dock = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Navigation items with their routes and icons
  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Agents', icon: <AgentsIcon />, path: '/agents' },
    { text: 'Tasks', icon: <TasksIcon />, path: '/tasks' },
    { text: 'Metrics', icon: <MetricsIcon />, path: '/metrics' },
    { text: 'Logs', icon: <LogsIcon />, path: '/logs' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  // Toggle chat widget visibility
  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
    
    // Dispatch custom event to notify ChatWidget
    const event = new CustomEvent('toggle-chat-widget', {
      detail: { isOpen: !isChatOpen }
    });
    window.dispatchEvent(event);
  };
  
  // Add effect to listen for chat widget state changes
  useEffect(() => {
    const handleChatStateChange = (event) => {
      const { isOpen } = event.detail;
      setIsChatOpen(isOpen);
    };
    
    window.addEventListener('chat-widget-state-change', handleChatStateChange);
    
    return () => {
      window.removeEventListener('chat-widget-state-change', handleChatStateChange);
    };
  }, []);
  
  return (
    <Paper
      elevation={3}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'center',
        borderRadius: '16px 16px 0 0',
        padding: '8px 16px 4px 16px',
        backgroundColor: (theme) => 
          theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 -4px 10px rgba(0, 0, 0, 0.1)',
        mb: 0,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Tooltip key={item.text} title={item.text} placement="top">
              <IconButton
                onClick={() => navigate(item.path)}
                sx={{
                  color: isActive ? 'primary.main' : 'text.secondary',
                  backgroundColor: isActive ? 
                    (theme) => 
                      theme.palette.mode === 'dark' 
                        ? 'rgba(80, 80, 80, 0.3)' 
                        : 'rgba(230, 230, 230, 0.5)'
                    : 'transparent',
                  p: 1.5,
                  borderRadius: '12px',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-5px) scale(1.1)',
                    color: 'primary.main',
                  },
                }}
              >
                {item.icon}
              </IconButton>
            </Tooltip>
          );
        })}
        
        {/* Chat button */}
        <Tooltip title="Chat" placement="top">
          <IconButton
            onClick={handleChatToggle}
            sx={{
              color: isChatOpen ? 'primary.main' : 'text.secondary',
              backgroundColor: isChatOpen ?
                (theme) => 
                  theme.palette.mode === 'dark' 
                    ? 'rgba(80, 80, 80, 0.3)' 
                    : 'rgba(230, 230, 230, 0.5)'
                : 'transparent',
              p: 1.5,
              borderRadius: '12px',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-5px) scale(1.1)',
                color: 'primary.main',
              },
              ...(isChatOpen && {
                animation: 'bounce 0.5s',
                '@keyframes bounce': {
                  '0%, 20%, 50%, 80%, 100%': {
                    transform: 'translateY(0) scale(1)',
                  },
                  '40%': {
                    transform: 'translateY(-20px) scale(1.2)',
                  },
                  '60%': {
                    transform: 'translateY(-10px) scale(1.1)',
                  }
                },
              }),
              ml: 2, // Add some separation between navigation and chat
            }}
          >
            <ChatIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default Dock; 