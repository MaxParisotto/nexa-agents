import fs from 'fs/promises';
import path from 'path';

const configFilePath = path.join(process.cwd(), 'config', 'uplink.json');

export const saveConfigToFile = async (config) => {
  try {
    // Create config directory if it doesn't exist
    await fs.mkdir(path.dirname(configFilePath), { recursive: true });
    
    // Write configuration to file
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));
    return config;
  } catch (error) {
    console.error('Error saving uplink configuration:', error);
    throw new Error('Failed to save uplink configuration');
  }
};

export const loadConfigFromFile = async () => {
  try {
    const data = await fs.readFile(configFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Return default config if file doesn't exist
      return {
        websocket: {
          host: 'localhost',
          port: 8081,
          enabled: true
        },
        rest: {
          host: 'localhost',
          port: 3000,
          enabled: true
        }
      };
    }
    console.error('Error loading uplink configuration:', error);
    throw new Error('Failed to load uplink configuration');
  }
};
