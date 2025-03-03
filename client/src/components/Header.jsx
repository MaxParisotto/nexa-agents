import React from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function Header() {
  const theme = useTheme();

  return (
    <AppBar position="static" sx={{ backgroundColor: theme.palette.background.paper }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Nexa Agents
        </Typography>
      </Toolbar>
    </AppBar>
  );
}