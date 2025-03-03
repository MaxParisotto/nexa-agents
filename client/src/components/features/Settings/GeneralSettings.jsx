import React from 'react';
import { Box, Typography, TextField, Button, Paper, Grid, Switch, FormControlLabel } from '@mui/material';

const GeneralSettings = () => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>General Settings</Typography>
      <Paper sx={{ p: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Application Name"
              variant="outlined"
              defaultValue="Nexa Agents"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Server Port"
              variant="outlined"
              defaultValue="3001"
              type="number"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Uplink Port"
              variant="outlined"
              defaultValue="3002"
              type="number"
            />
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel 
              control={<Switch defaultChecked />} 
              label="Auto-start server on application launch" 
            />
          </Grid>
          
          <Grid item xs={12}>
            <Button variant="contained" color="primary">
              Save Settings
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default GeneralSettings;
