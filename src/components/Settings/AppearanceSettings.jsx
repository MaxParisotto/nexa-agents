import React, { useState } from 'react';
import { Box, Typography, Paper, Grid, FormControl, FormLabel, RadioGroup, Radio, FormControlLabel, Button, Slider, Select, MenuItem, InputLabel, Switch } from '@mui/material';

const AppearanceSettings = () => {
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState(14);

  const handleThemeChange = (event) => {
    setTheme(event.target.value);
  };

  const handleFontSizeChange = (event, newValue) => {
    setFontSize(newValue);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Appearance Settings</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Theme</Typography>
        <FormControl component="fieldset">
          <RadioGroup row value={theme} onChange={handleThemeChange}>
            <FormControlLabel value="light" control={<Radio />} label="Light" />
            <FormControlLabel value="dark" control={<Radio />} label="Dark" />
            <FormControlLabel value="system" control={<Radio />} label="Use system setting" />
          </RadioGroup>
        </FormControl>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Font Size</Typography>
        <Box sx={{ width: 300 }}>
          <Slider
            value={fontSize}
            onChange={handleFontSizeChange}
            aria-labelledby="font-size-slider"
            valueLabelDisplay="auto"
            step={1}
            marks
            min={10}
            max={20}
          />
          <Typography id="font-size-slider" gutterBottom>
            Font Size: {fontSize}px
          </Typography>
        </Box>
      </Paper>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>Layout</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Default View</InputLabel>
              <Select
                value="dashboard"
                label="Default View"
              >
                <MenuItem value="dashboard">Dashboard</MenuItem>
                <MenuItem value="workflow">Workflow Editor</MenuItem>
                <MenuItem value="agents">Agents</MenuItem>
                <MenuItem value="tasks">Tasks</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Show sidebar"
            />
          </Grid>
        </Grid>
      </Paper>
      
      <Button variant="contained" color="primary">
        Save Appearance Settings
      </Button>
    </Box>
  );
};

export default AppearanceSettings;
