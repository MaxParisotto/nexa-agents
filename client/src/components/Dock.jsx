import React from 'react';
import { Box, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export default function Dock() {
  const theme = useTheme();

  return (
    <Box 
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
        padding: theme.spacing(1)
      }}
    >
      <IconButton color="primary">
        {/* Add icons here */}
      </IconButton>
    </Box>
  );
}