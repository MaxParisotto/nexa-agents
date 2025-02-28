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
  Chat as ChatIcon,
  ManageAccounts as ProjectManagerIcon
} from '@mui/icons-material';

/**
 * Dock component that displays a macOS-style dock at the bottom of the screen
 * Provides access to main app sections with animated icons
 */
const Dock = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProjectManagerChatOpen, setIsProjectManagerChatOpen] = useState(false);
  
  // Navigation items with their routes and icons
  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Agents', icon: <AgentsIcon />, path: '/agents' },
    { text: 'Tasks', icon: <TasksIcon />, path: '/tasks' },
    { text: 'Metrics', icon: <MetricsIcon />, path: '/metrics' },
    { text: 'Logs', icon: <LogsIcon />, path: '/logs' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
    { text: 'Agora', icon: <ChatIcon />, path: '/agora' },
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
  
  // Toggle Project Manager chat visibility
  const handleProjectManagerChatToggle = () => {
    setIsProjectManagerChatOpen(!isProjectManagerChatOpen);
    
    // Dispatch custom event to notify ProjectManagerChat
    const event = new CustomEvent('toggle-project-manager-chat', {
      detail: { isOpen: !isProjectManagerChatOpen, chatType: 'projectManager' }
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
  
  // Add effect to listen for Project Manager chat state changes
  useEffect(() => {
    const handleProjectManagerChatStateChange = (event) => {
      const { isVisible } = event.detail;
      setIsProjectManagerChatOpen(isVisible);
    };
    
    window.addEventListener('project-manager-chat-visibility-changed', handleProjectManagerChatStateChange);
    
    return () => {
      window.removeEventListener('project-manager-chat-visibility-changed', handleProjectManagerChatStateChange);
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
        
        {/* Divider */}
        <Box 
          sx={{ 
            width: '1px', 
            bgcolor: 'divider', 
            mx: 1, 
            alignSelf: 'stretch',
            my: 0.5
          }} 
        />
        
        {/* Chat button */}
        <Tooltip title="Chat with LLM" placement="top">
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
            }}
          >
            <ChatIcon />
          </IconButton>
        </Tooltip>
        
        {/* Project Manager Chat button */}
        <Tooltip title="Project Manager" placement="top">
          <IconButton
            onClick={handleProjectManagerChatToggle}
            sx={{
              color: isProjectManagerChatOpen ? 'primary.main' : 'text.secondary',
              backgroundColor: isProjectManagerChatOpen ? 
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
            <ProjectManagerIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default Dock;
