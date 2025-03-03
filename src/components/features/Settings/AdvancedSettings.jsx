import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, TextField, Button, Switch, FormControlLabel, Divider, Alert } from '@mui/material';

const AdvancedSettings = () => {
  const [showDangerZone, setShowDangerZone] = useState(false);
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Advanced Settings</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Performance</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Max Concurrent Requests"
              type="number"
              variant="outlined"
              defaultValue={5}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Request Timeout (ms)"
              type="number"
              variant="outlined"
              defaultValue={30000}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Enable memory caching"
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Logging</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Log Level"
              SelectProps={{
                native: true,
              }}
              variant="outlined"
              defaultValue="info"
            >
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Log to file"
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Button 
        variant="outlined" 
        color="error" 
        sx={{ mb: 2 }}
        onClick={() => setShowDangerZone(!showDangerZone)}
      >
        {showDangerZone ? 'Hide Danger Zone' : 'Show Danger Zone'}
      </Button>
      
      {showDangerZone && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'error.light', color: 'error.contrastText' }}>
          <Typography variant="subtitle1" gutterBottom>Danger Zone</Typography>
          <Alert severity="warning" sx={{ mb: 2 }}>
            These actions can cause data loss and are not reversible.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Button variant="contained" color="error" fullWidth>
                Reset All Settings
              </Button>
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" color="error" fullWidth>
                Clear All Data
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};

export default AdvancedSettings;
