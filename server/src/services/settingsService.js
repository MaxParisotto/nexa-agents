/**
 * Settings Service - Handles application settings
 */
const fs = require('fs');
const path = require('path');

// Config files
const DATA_DIR = path.join(__dirname, '../../../data');
const CONFIG_DIR = path.join(__dirname, '../../../config');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');

// Default settings
const DEFAULT_SETTINGS = {
  theme: {
    darkMode: false,
    accentColor: '#4a76a8'
  },
  api: {
    lmStudio: {
      apiUrl: 'http://localhost:1234',
      apiKey: '',
      defaultModel: 'unknown'
    },
    ollama: {
      apiUrl: 'http://localhost:11434',
      defaultModel: 'llama2'
    },
  },
  notifications: {
    enabled: true,
    sound: true
  },
  system: {
    autoSave: true,
    loggingLevel: 'info',
    metricsEnabled: true
  },
  version: '1.0.0',
  lastUpdated: new Date().toISOString()
};

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Get all settings
function getSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  
  try {
    const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading settings file:', error);
    return DEFAULT_SETTINGS;
  }
}

// Update settings
function updateSettings(newSettings) {
  const currentSettings = getSettings();
  
  const updatedSettings = {
    ...currentSettings,
    ...newSettings,
    lastUpdated: new Date().toISOString()
  };
  
  saveSettings(updatedSettings);
  return updatedSettings;
}

// Reset settings to default
function resetSettings() {
  const defaultSettings = {
    ...DEFAULT_SETTINGS,
    lastUpdated: new Date().toISOString()
  };
  
  saveSettings(defaultSettings);
  return defaultSettings;
}

// Save settings to file
function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error writing settings file:', error);
    throw new Error('Failed to save settings');
  }
}

module.exports = {
  getSettings,
  updateSettings,
  resetSettings
};