import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, Drawer, AppBar, Toolbar, Typography, Divider, IconButton,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip,
  useMediaQuery, useTheme, Menu, MenuItem, Avatar, Badge 
} from '@mui/material';

// Import icons
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BoltIcon from '@mui/icons-material/Bolt';
import LinkIcon from '@mui/icons-material/Link';
import PublicIcon from '@mui/icons-material/Public';
import SpeedIcon from '@mui/icons-material/Speed';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import LogoIcon from '@mui/icons-material/Memory';
import ListAltIcon from '@mui/icons-material/ListAlt';

import { useSettings } from '../../contexts/SettingsContext';

// Drawer width
const DRAWER_WIDTH = 240;

/**
 * FixedLayout Component - Application layout with fixed sidebar and header
 */
export default function FixedLayout({ darkMode, toggleDarkMode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  
  // State for drawer on mobile
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(null);

  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Handle user menu
  const handleUserMenuOpen = (event) => {
    setUserMenuOpen(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuOpen(null);
  };
  
  // Handle notifications menu
  const handleNotificationsOpen = (event) => {
    setNotificationsOpen(event.currentTarget);
  };
  
  const handleNotificationsClose = () => {
    setNotificationsOpen(null);
  };

  // Navigation items
  const navigationItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: <DashboardIcon /> 
    },
    { 
      name: 'Workflows', 
      path: '/workflows', 
      icon: <AccountTreeIcon /> 
    },
    { 
      name: 'Metrics', 
      path: '/metrics', 
      icon: <AssessmentIcon /> 
    },
    { 
      name: 'Logs', 
      path: '/logs', 
      icon: <ListAltIcon /> 
    },
    { 
      divider: true 
    },
    { 
      name: 'GPT Uplink', 
      path: '/integrations/gpt-uplink', 
      icon: <LinkIcon /> 
    },
    { 
      name: 'Benchmark', 
      path: '/benchmark', 
      icon: <SpeedIcon /> 
    },
    { 
      name: 'Agora', 
      path: '/agora', 
      icon: <PublicIcon /> 
    },
    { 
      divider: true 
    },
    { 
      name: 'Settings', 
      path: '/settings', 
      icon: <SettingsIcon /> 
    }
  ];

  // Drawer content (shared between permanent and temporary drawers)
  const drawerContent = (
    <>
      <Toolbar
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          px: [1]
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LogoIcon sx={{ mr: 1, fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Nexa Agents
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={handleDrawerToggle}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List component="nav" sx={{ px: 1 }}>
        {navigationItems.map((item, index) => (
          item.divider ? (
            <Divider key={`divider-${index}`} sx={{ my: 1 }} />
          ) : (
            <ListItem key={item.name} disablePadding sx={{ 
              display: 'block',
              mb: 0.5,
              bgcolor: location.pathname === item.path ? 'action.selected' : 'transparent',
              borderRadius: 1
            }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) {
                    setMobileOpen(false);
                  }
                }}
                sx={{
                  minHeight: 48,
                  borderRadius: 1,
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 2,
                    color: location.pathname === item.path ? 'primary.main' : 'inherit'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.name} 
                  primaryTypographyProps={{
                    fontWeight: location.pathname === item.path ? 'bold' : 'regular',
                    color: location.pathname === item.path ? 'primary.main' : 'inherit'
                  }}
                />
              </ListItemButton>
            </ListItem>
          )
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Box sx={{ p: 2, mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary" component="div" align="center">
          Nexa Agents v0.1.0
        </Typography>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App bar */}
      <AppBar
        position="fixed"
        elevation={1}
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: darkMode ? 'background.paper' : 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <IconButton
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Theme toggle */}
          <Tooltip title={darkMode ? 'Light Mode' : 'Dark Mode'}>
            <IconButton 
              color="inherit" 
              onClick={toggleDarkMode}
              sx={{ ml: 1 }}
            >
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          
          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton 
              color="inherit" 
              onClick={handleNotificationsOpen}
              sx={{ ml: 1 }}
            >
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          {/* User menu */}
          <Tooltip title="User Account">
            <IconButton 
              edge="end" 
              aria-haspopup="true"
              onClick={handleUserMenuOpen}
              color="inherit"
              sx={{ ml: 1 }}
            >
              <Avatar 
                alt="User" 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: theme.palette.primary.main 
                }}
              >
                <PersonIcon />
              </Avatar>
            </IconButton>
          </Tooltip>
          
          {/* User menu dropdown */}
          <Menu
            id="user-menu"
            anchorEl={userMenuOpen}
            open={Boolean(userMenuOpen)}
            onClose={handleUserMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              elevation: 2,
              sx: { mt: 1, width: 200 }
            }}
          >
            <MenuItem onClick={() => { 
              handleUserMenuClose(); 
              navigate('/settings'); 
            }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Settings</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleUserMenuClose}>
              <ListItemIcon>
                <ExitToAppIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Logout</ListItemText>
            </MenuItem>
          </Menu>
          
          {/* Notifications dropdown */}
          <Menu
            id="notifications-menu"
            anchorEl={notificationsOpen}
            open={Boolean(notificationsOpen)}
            onClose={handleNotificationsClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              elevation: 2,
              sx: { mt: 1, width: 320 }
            }}
          >
            <MenuItem>
              <Typography variant="subtitle2" color="primary">
                New workflow created
              </Typography>
            </MenuItem>
            <MenuItem>
              <Typography variant="subtitle2" color="primary">
                LLM benchmark completed
              </Typography>
            </MenuItem>
            <MenuItem>
              <Typography variant="subtitle2" color="primary">
                Ollama model updated
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem sx={{ justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                View all notifications
              </Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* Drawer - different behavior on mobile vs desktop */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer (temporary) */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' }
          }}
        >
          {drawerContent}
        </Drawer>
        
        {/* Desktop drawer (permanent) */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: '1px solid', borderColor: 'divider' }
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
          overflow: 'auto'
        }}
      >
        <Toolbar /> {/* Adds spacing below the app bar */}
        <Outlet /> {/* Render the nested routes */}
      </Box>
    </Box>
  );
}
