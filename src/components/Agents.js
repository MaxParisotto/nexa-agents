import React from 'react';
import { Typography, Box } from '@mui/material';

const Agents = () => {
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Agents
      </Typography>
      <Typography variant="body1">
        This is the Agents page.
      </Typography>
    </Box>
  );
};

export default Agents;
