import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
  Tooltip,
  Avatar,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Paper
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import WorkIcon from '@mui/icons-material/Work';
import InsightsIcon from '@mui/icons-material/Insights';
import HelpIcon from '@mui/icons-material/Help';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import SpeedIcon from '@mui/icons-material/Speed';
import StoreIcon from '@mui/icons-material/Store';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Footer from './Footer';

/**
 * Fixed Layout Component with bottom navigation bar
 */
export default function FixedLayout({ darkMode, toggleDarkMode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation items
  const navItems = [
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { text: 'Workflows', path: '/workflows', icon: <WorkIcon /> },
    { text: 'Agents', path: '/agents', icon: <PrecisionManufacturingIcon /> },
    { text: 'Metrics', path: '/metrics', icon: <InsightsIcon /> },
    { text: 'Benchmark', path: '/benchmark', icon: <SpeedIcon /> },
    { text: 'Agora', path: '/agora', icon: <StoreIcon /> },
    { text: 'Settings', path: '/settings', icon: <SettingsIcon /> },
  ];
  
  // Get current navigation value based on path
  const getCurrentNavValue = () => {
    const currentPath = location.pathname;
    const foundItem = navItems.find(item => currentPath.startsWith(item.path));
    return foundItem ? foundItem.path : false;
  };
  
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMobileMenuAnchor(null);
  };
  
  const handleLogout = () => {
    handleMenuClose();
    console.log('Logging out...');
  };
  
  const handleNav = (path) => {
    navigate(path);
    handleMenuClose();
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Top App Bar */}
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Nexa Agents
          </Typography>
          
          {/* Desktop navigation icons */}
          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            <Tooltip title="Toggle theme">
              <IconButton color="inherit" onClick={toggleDarkMode}>
                {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Notifications">
              <IconButton color="inherit">
                <Badge badgeContent={3} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Help">
              <IconButton color="inherit">
                <HelpIcon />
              </IconButton>
            </Tooltip>
            
            <IconButton
              edge="end"
              aria-label="account of current user"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark' }}>U</Avatar>
            </IconButton>
          </Box>
          
          {/* Mobile menu icon */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              color="inherit"
              aria-label="more actions"
              aria-haspopup="true"
              onClick={handleMobileMenuOpen}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* User Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => { handleNav('/profile'); }}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleNav('/settings'); }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Mobile Menu */}
      <Menu
        anchorEl={mobileMenuAnchor}
        open={Boolean(mobileMenuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={toggleDarkMode}>
          <ListItemIcon>
            {darkMode ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{darkMode ? 'Light Mode' : 'Dark Mode'}</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <Badge badgeContent={3} color="error">
              <NotificationsIcon fontSize="small" />
            </Badge>
          </ListItemIcon>
          <ListItemText>Notifications</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleNav('/profile'); }}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleNav('/settings'); }}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Main Content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          overflow: 'auto',
          p: 3,
          pb: isMobile ? 7 : 3, // Add extra padding at bottom for mobile to account for bottom nav
        }}
      >
        <Outlet />
      </Box>
      
      {/* Fixed Bottom Navigation */}
      <Paper 
        sx={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          zIndex: theme.zIndex.appBar,
          borderTop: `1px solid ${theme.palette.divider}`,
        }} 
        elevation={3}
      >
        <BottomNavigation
          showLabels
          value={getCurrentNavValue()}
          onChange={(event, newValue) => {
            handleNav(newValue);
          }}
        >
          {navItems.map((item) => (
            <BottomNavigationAction 
              key={item.path} 
              label={item.text} 
              icon={item.icon} 
              value={item.path}
              sx={isMobile ? { minWidth: 'auto' } : {}}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
