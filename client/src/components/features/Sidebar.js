import React from 'react';
import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Dashboard as DashboardIcon, 
  SmartToy as AgentsIcon,
  Assignment as TasksIcon,
  Timeline as MetricsIcon,
  Assessment as LogsIcon,
  Settings as SettingsIcon,
  SmartToy as SmartToyIcon
} from '@mui/icons-material';

/**
 * Sidebar component with navigation links
 * Provides access to main app sections
 */
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const drawerWidth = 240;
  
  // Navigation items with their routes and icons
  const navItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Agents', icon: <AgentsIcon />, path: '/agents' },
    { text: 'Tasks', icon: <TasksIcon />, path: '/tasks' },
    { text: 'Metrics', icon: <MetricsIcon />, path: '/metrics' },
    { text: 'Logs', icon: <LogsIcon />, path: '/logs' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];
  
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box sx={{ overflow: 'auto', flex: 1 }}>
        <List>
          {navItems.map((item, index) => (
            <ListItem 
              button 
              key={item.text}
              onClick={() => navigate(item.path)}
              selected={location.pathname === item.path}
            >
              <ListItemIcon sx={{ 
                color: location.pathname === item.path ? 'primary.main' : 'inherit' 
              }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                  color: location.pathname === item.path ? 'primary.main' : 'inherit'
                }}
              />
            </ListItem>
          ))}
        </List>
        <Divider />
      </Box>
      
      {/* Chat button at the bottom */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <ListItem 
          button 
          sx={{ 
            borderRadius: 1,
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
          onClick={() => {
            const event = new CustomEvent('toggle-chat-widget', {
              detail: { isOpen: true }
            });
            window.dispatchEvent(event);
          }}
        >
          <ListItemIcon>
            <SmartToyIcon color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Project Manager" 
            primaryTypographyProps={{
              variant: 'body2',
              color: 'primary'
            }}
          />
        </ListItem>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 