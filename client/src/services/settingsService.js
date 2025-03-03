import { DEFAULT_SETTINGS } from '../shared/defaultSettings';
import { apiService } from './api';

// Local storage keys
const STORAGE_KEYS = {
  SETTINGS: 'nexa_settings',
  THEME: 'nexa_theme',
  USER_PREFERENCES: 'nexa_user_prefs'
};

/**
 * Settings service for managing application settings
 */
class SettingsService {
  constructor() {
    this.settings = null;
    this.listeners = [];
    this.initializationPromise = null;
  }

  /**
   * Initialize settings from API or localStorage
   */
  async initialize() {
    // If initialization is already in progress, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Create a new initialization promise
    this.initializationPromise = this._doInitialize();
    return this.initializationPromise;
  }
  
  /**
   * Internal initialization method
   */
  async _doInitialize() {
    try {
      // Try to load from API first, which already handles localStorage fallback
      const response = await apiService.getSettings();
      if (response && response.data) {
        this.settings = response.data;
        return this.settings;
      }
    } catch (error) {
      console.log('Error during settings initialization:', error);
    }

    // If the above fails completely, use default settings
    this.settings = DEFAULT_SETTINGS;
    return this.settings;
  }

  /**
   * Fetch settings from the API
   */
  async fetchFromApi() {
    try {
      const response = await apiService.getSettings();
      return response?.data || null;
    } catch (error) {
      console.log('Could not fetch settings from API');
      return null;
    }
  }

  /**
   * Get settings from localStorage
   */
  getFromLocalStorage() {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return storedSettings ? JSON.parse(storedSettings) : null;
    } catch (error) {
      console.error('Error reading settings from localStorage:', error);
      return null;
    }
  }

  /**
   * Save settings to localStorage
   */
  saveToLocalStorage(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
      return false;
    }
  }

  /**
   * Get the current settings
   */
  async getSettings() {
    if (!this.settings) {
      await this.initialize();
    }
    return this.settings;
  }

  /**
   * Update settings both in API and localStorage
   */
  async updateSettings(newSettings) {
    // Update through API service, which handles fallbacks
    await apiService.updateSettings(newSettings);
    
    // Update memory reference
    this.settings = newSettings;
    
    // Notify listeners
    this.notifyListeners(newSettings);
    
    return newSettings;
  }

  /**
   * Update a specific section of settings
   */
  async updateSection(section, values) {
    const currentSettings = await this.getSettings();
    const newSettings = {
      ...currentSettings,
      [section]: {
        ...currentSettings[section],
        ...values
      }
    };

    return this.updateSettings(newSettings);
  }

  /**
   * Get a specific section of settings
   */
  async getSection(section) {
    const settings = await this.getSettings();
    return settings[section] || null;
  }

  /**
   * Reset all settings to defaults
   */
  async resetSettings() {
    return this.updateSettings(DEFAULT_SETTINGS);
  }

  /**
   * Reset a specific section to defaults
   */
  async resetSection(section) {
    const settings = await this.getSettings();
    return this.updateSettings({
      ...settings,
      [section]: DEFAULT_SETTINGS[section]
    });
  }

  /**
   * Add a listener for settings changes
   */
  addListener(listener) {
    this.listeners.push(listener);
    return () => this.removeListener(listener);
  }

  /**
   * Remove a listener
   */
  removeListener(listener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners of settings changes
   */
  notifyListeners(settings) {
    this.listeners.forEach(listener => {
      try {
        listener(settings);
      } catch (error) {
        console.error('Error in settings listener:', error);
      }
    });
  }
  
  /**
   * Export settings to a JSON file
   */
  async exportSettings() {
    const settings = await this.getSettings();
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `nexa-settings-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
  
  /**
   * Import settings from a JSON file
   * @param {File} file - The JSON file to import
   */
  async importSettings(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const settings = JSON.parse(event.target.result);
          await this.updateSettings(settings);
          resolve(settings);
        } catch (error) {
          reject(new Error('Invalid settings file format'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read the file'));
      };
      
      reader.readAsText(file);
    });
  }
}

// Create singleton instance
const settingsService = new SettingsService();

export default settingsService;
