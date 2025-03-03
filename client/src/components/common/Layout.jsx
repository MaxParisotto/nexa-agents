import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  AppBar, Box, CssBaseline, Drawer, Divider, IconButton, 
  List, ListItem, ListItemButton, ListItemIcon, ListItemText, 
  Toolbar, Typography, useMediaQuery, Switch, FormControlLabel
} from '@mui/material';

// Import MUI Icons
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

// Import custom components
import NavigationItem from './NavigationItem';

// Drawer width
const DRAWER_WIDTH = 240;

// Navigation items configuration
const NAV_ITEMS = [
  { title: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { title: 'Workflows', icon: <AccountTreeIcon />, path: '/workflows' },
  { title: 'Metrics', icon: <AssessmentIcon />, path: '/metrics' },
  { title: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

/**
 * Main layout component with responsive drawer navigation
 */
export default function Layout({ darkMode, toggleDarkMode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isSmallScreen = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Drawer content - shared between permanent and temporary drawers
  const drawerContent = (
    <>
      <Toolbar sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        px: [1]
      }}>
        <Typography variant="h6" noWrap component="div">
          Nexa Agents
        </Typography>
        {isSmallScreen && (
          <IconButton onClick={handleDrawerToggle}>
            <CloseIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List>
        {NAV_ITEMS.map((item) => (
          <NavigationItem 
            key={item.title}
            title={item.title}
            icon={item.icon}
            path={item.path}
            onClick={isSmallScreen ? handleDrawerToggle : undefined}
          />
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      <Divider />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={toggleDarkMode}
              name="darkMode"
              color="primary"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {darkMode ? <Brightness7Icon sx={{ mr: 1 }} /> : <Brightness4Icon sx={{ mr: 1 }} />}
              <Typography variant="body2">
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </Typography>
            </Box>
          }
        />
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App bar - only visible on mobile */}
      <AppBar
        position="fixed"
        sx={{
          display: { sm: 'none' },
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { sm: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Nexa Agents
          </Typography>
        </Toolbar>
      </AppBar>
      
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: DRAWER_WIDTH 
          },
        }}
      >
        {drawerContent}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: DRAWER_WIDTH 
          },
          width: DRAWER_WIDTH,
          flexShrink: 0,
        }}
        open
      >
        {drawerContent}
      </Drawer>
      
      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          overflowX: 'hidden'
        }}
      >
        {/* Toolbar spacer for mobile view */}
        <Toolbar sx={{ display: { sm: 'none' } }} />
        
        {/* Render child routes */}
        <Outlet />
      </Box>
    </Box>
  );
}
