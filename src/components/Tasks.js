import React from 'react';
import { Typography, Box } from '@mui/material';

const Tasks = () => {
  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Tasks
      </Typography>
      <Typography variant="body1">
        This is the Tasks page.
      </Typography>
    </Box>
  );
};

export default Tasks;
