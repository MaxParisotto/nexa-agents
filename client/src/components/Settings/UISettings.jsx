import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, FormControlLabel, Switch,
  Slider, Select, MenuItem, FormControl, InputLabel, 
  Button, Divider, Card, CardContent
} from '@mui/material';
import { MuiColorInput } from 'mui-color-input';

/**
 * UI Settings Component
 */
export default function UISettings({ settings, onUpdateSettings }) {
  const [themeSettings, setThemeSettings] = useState(settings.theme || {
    darkMode: true,
    primaryColor: '#4a76a8',
    secondaryColor: '#ffc107',
    fontSize: 'medium',
    fontFamily: 'Roboto, sans-serif'
  });
  
  const [uiSettings, setUiSettings] = useState(settings.ui || {
    animations: true,
    sidebar: {
      expanded: true,
      width: 240
    },
    lists: {
      compact: false,
      showDescriptions: true
    }
  });
  
  // Handle theme settings change
  const handleThemeChange = (field, value) => {
    const updatedTheme = {
      ...themeSettings,
      [field]: value
    };
    
    setThemeSettings(updatedTheme);
    onUpdateSettings('theme', updatedTheme);
  };
  
  // Handle UI settings change
  const handleUiChange = (field, value) => {
    const pathParts = field.split('.');
    
    // Handle nested properties
    if (pathParts.length > 1) {
      const [parent, child] = pathParts;
      const updatedUi = {
        ...uiSettings,
        [parent]: {
          ...uiSettings[parent],
          [child]: value
        }
      };
      
      setUiSettings(updatedUi);
      onUpdateSettings('ui', updatedUi);
    } else {
      const updatedUi = {
        ...uiSettings,
        [field]: value
      };
      
      setUiSettings(updatedUi);
      onUpdateSettings('ui', updatedUi);
    }
  };
  
  // Font size options
  const fontSizes = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' }
  ];
  
  // Font family options
  const fontFamilies = [
    { value: 'Roboto, sans-serif', label: 'Roboto' },
    { value: 'Inter, sans-serif', label: 'Inter' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Verdana, sans-serif', label: 'Verdana' },
    { value: 'monospace', label: 'Monospace' }
  ];
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        UI & Appearance
      </Typography>
      
      {/* Theme Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Theme Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={themeSettings.darkMode}
                  onChange={(e) => handleThemeChange('darkMode', e.target.checked)}
                />
              }
              label="Dark Mode"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ mr: 2, minWidth: '100px' }}>
                Primary Color:
              </Typography>
              <MuiColorInput
                value={themeSettings.primaryColor}
                onChange={(color) => handleThemeChange('primaryColor', color)}
                format="hex"
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography sx={{ mr: 2, minWidth: '100px' }}>
                Secondary Color:
              </Typography>
              <MuiColorInput
                value={themeSettings.secondaryColor}
                onChange={(color) => handleThemeChange('secondaryColor', color)}
                format="hex"
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Font Size</InputLabel>
              <Select
                value={themeSettings.fontSize || 'medium'}
                onChange={(e) => handleThemeChange('fontSize', e.target.value)}
                label="Font Size"
              >
                {fontSizes.map((size) => (
                  <MenuItem key={size.value} value={size.value}>
                    {size.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Font Family</InputLabel>
              <Select
                value={themeSettings.fontFamily || 'Roboto, sans-serif'}
                onChange={(e) => handleThemeChange('fontFamily', e.target.value)}
                label="Font Family"
              >
                {fontFamilies.map((family) => (
                  <MenuItem key={family.value} value={family.value}>
                    {family.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {/* UI Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          UI Settings
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={uiSettings.animations}
                  onChange={(e) => handleUiChange('animations', e.target.checked)}
                />
              }
              label="Animations"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={uiSettings.sidebar.expanded}
                  onChange={(e) => handleUiChange('sidebar.expanded', e.target.checked)}
                />
              }
              label="Sidebar Expanded"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography gutterBottom>
              Sidebar Width
            </Typography>
            <Slider
              value={uiSettings.sidebar.width}
              onChange={(e, value) => handleUiChange('sidebar.width', value)}
              min={200}
              max={400}
              step={10}
              valueLabelDisplay="auto"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={uiSettings.lists.compact}
                  onChange={(e) => handleUiChange('lists.compact', e.target.checked)}
                />
              }
              label="Compact Lists"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={uiSettings.lists.showDescriptions}
                  onChange={(e) => handleUiChange('lists.showDescriptions', e.target.checked)}
                />
              }
              label="Show Descriptions"
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
