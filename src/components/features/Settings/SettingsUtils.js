export const validateSettings = (settings) => {
  const errors = {};

  // Validate OpenAI settings
  if (settings.openai.enabled) {
    if (!settings.openai.websocketUrl) {
      errors.openai = errors.openai || {};
      errors.openai.websocketUrl = 'WebSocket URL is required';
    }
    
    if (!settings.openai.restUrl) {
      errors.openai = errors.openai || {};
      errors.openai.restUrl = 'REST API URL is required';
    }

    if (!settings.openai.apiKey) {
      errors.openai = errors.openai || {};
      errors.openai.apiKey = 'API Key is required';
    }
  }

  // Validate URLs
  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  if (settings.openai.websocketUrl && !validateUrl(settings.openai.websocketUrl)) {
    errors.openai = errors.openai || {};
    errors.openai.websocketUrl = 'Invalid WebSocket URL';
  }

  if (settings.openai.restUrl && !validateUrl(settings.openai.restUrl)) {
    errors.openai = errors.openai || {};
    errors.openai.restUrl = 'Invalid REST API URL';
  }

  return errors;
};

export const getDefaultSettings = () => ({
  openai: {
    websocketUrl: 'ws://localhost:3001/ws',
    restUrl: 'http://localhost:3001/api',
    apiKey: '',
    enabled: false
  }
});

export const saveSettings = async (settings) => {
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error('Failed to save settings');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

export const loadSettings = async () => {
  try {
    const response = await fetch('/api/settings');
    if (!response.ok) {
      throw new Error('Failed to load settings');
    }
    return await response.json();
  } catch (error) {
    console.error('Error loading settings:', error);
    throw error;
  }
};
