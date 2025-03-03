import React from 'react';
import { 
  Grid, FormControlLabel, Switch, TextField,
  Typography, Box, Divider, InputLabel,
  FormControl, Button
} from '@mui/material';

/**
 * UI Settings Form Component
 * @param {Object} props - Component props
 * @param {Object} props.settings - Settings object
 * @param {Function} props.onSettingChange - Callback for setting changes
 * @param {boolean} props.darkMode - Current dark mode state
 */
export default function UiSettingsForm({ settings, onSettingChange, darkMode }) {
  // Handle dark mode toggle
  const handleDarkModeToggle = (event) => {
    onSettingChange('theme', 'darkMode', event.target.checked);
  };
  
  // Handle accent color change
  const handleColorChange = (event) => {
    onSettingChange('theme', 'accentColor', event.target.value);
  };
  
  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>User Interface Settings</Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Customize the appearance of the application
        </Typography>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={handleDarkModeToggle}
              name="darkMode"
              color="primary"
            />
          }
          label="Dark Mode"
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth>
          <TextField
            label="Accent Color"
            name="accentColor"
            value={settings.theme.accentColor}
            onChange={handleColorChange}
            helperText="Enter a hex color code (e.g., #4a76a8)"
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </FormControl>
      </Grid>
      
      <Grid item xs={12}>
        <Divider />
      </Grid>
      
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>Font Settings</Typography>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Font Family"
          value="system-ui"
          SelectProps={{ native: true }}
          disabled
          helperText="Coming soon in a future update"
        >
          <option value="system-ui">System Default</option>
          <option value="roboto">Roboto</option>
          <option value="open-sans">Open Sans</option>
        </TextField>
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          select
          fullWidth
          label="Font Size"
          value="medium"
          SelectProps={{ native: true }}
          disabled
          helperText="Coming soon in a future update"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </TextField>
      </Grid>
    </Grid>
  );
}