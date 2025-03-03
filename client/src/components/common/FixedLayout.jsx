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
  Paper,
  Stack
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
      {/* Top App Bar - Made more compact with horizontally aligned buttons */}
      <AppBar position="static" elevation={1}>
        <Toolbar 
          variant="dense" 
          sx={{ 
            minHeight: { xs: '48px', sm: '52px' }, 
            px: { xs: 1, sm: 2 },
            display: 'flex',
            justifyContent: 'space-between', // Ensures space between title and buttons
            alignItems: 'center' // Vertically centers content
          }}
        >
          {/* App Title */}
          <Typography 
            variant="subtitle1" 
            noWrap 
            component="div" 
            sx={{ 
              fontWeight: 500,
              fontSize: { xs: '0.9rem', sm: '1rem' }
            }}
          >
            Nexa Agents
          </Typography>
          
          {/* Desktop navigation icons - Using Stack for consistent horizontal spacing */}
          <Stack 
            direction="row" 
            spacing={1} 
            alignItems="center"
            sx={{ display: { xs: 'none', md: 'flex' } }}
          >
            <Tooltip title="Toggle theme">
              <IconButton 
                color="inherit" 
                onClick={toggleDarkMode}
                size="small"
              >
                {darkMode ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Notifications">
              <IconButton 
                color="inherit"
                size="small"
              >
                <Badge 
                  badgeContent={3} 
                  color="error" 
                  sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: '16px', minWidth: '16px' } }}
                >
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Help">
              <IconButton 
                color="inherit"
                size="small"
              >
                <HelpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <IconButton
              size="small"
              edge="end"
              aria-label="account of current user"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
            >
              <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.dark', fontSize: '0.8rem' }}>U</Avatar>
            </IconButton>
          </Stack>
          
          {/* Mobile menu icon */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              color="inherit"
              aria-label="more actions"
              aria-haspopup="true"
              onClick={handleMobileMenuOpen}
              size="small"
              edge="end"
            >
              <MenuIcon fontSize="small" />
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
      
      {/* Main Content - Adjusted top padding to account for smaller header */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          overflow: 'auto',
          px: 3,
          pt: 2,
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
        elevation={2}
      >
        <BottomNavigation
          showLabels
          value={getCurrentNavValue()}
          onChange={(event, newValue) => {
            handleNav(newValue);
          }}
          sx={{ minHeight: '56px', height: '56px' }}
        >
          {navItems.map((item) => (
            <BottomNavigationAction 
              key={item.path} 
              label={item.text} 
              icon={item.icon} 
              value={item.path}
              sx={{ 
                minWidth: 'auto',
                py: 0.5,
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.7rem',
                  marginTop: '2px'
                }
              }}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
