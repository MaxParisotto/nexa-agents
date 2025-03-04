import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, useTheme } from '@mui/material';
import { Brightness4 as DarkModeIcon, Brightness7 as LightModeIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';

/**
 * Header component for the application
 * Includes navigation, app title, and dark mode toggle
 */
const Header = ({ darkMode, toggleDarkMode }) => {
  const theme = useTheme();
  
  return (
    <AppBar position="static" elevation={3}>
      <Toolbar>
        {/* App title/logo */}
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            textDecoration: 'none',
            color: 'inherit',
            fontWeight: 'bold',
            flexGrow: 1
          }}
        >
          Nexa Agents
        </Typography>
        
        {/* Navigation links */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography
            component={Link}
            to="/"
            sx={{
              mx: 2,
              color: 'inherit',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Dashboard
          </Typography>
          
          <Typography
            component={Link}
            to="/agents"
            sx={{
              mx: 2,
              color: 'inherit',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Agents
          </Typography>
          
          <Typography
            component={Link}
            to="/settings"
            sx={{
              mx: 2,
              color: 'inherit',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            Settings
          </Typography>
        </Box>
        
        {/* Dark mode toggle */}
        <IconButton
          color="inherit"
          onClick={toggleDarkMode}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 