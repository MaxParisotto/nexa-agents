const logger = require('../../utils/logger').createLogger('config');
const fs = require('fs').promises;
const path = require('path');

class ConfigurationService {
  constructor() {
    this.configs = new Map();
    this.configPath = path.join(__dirname, '../../../../data/configs');
    this.watchers = new Map();
  }

  async initialize() {
    await this.ensureConfigDirectory();
    await this.loadAllConfigs();
    this.setupSocketHandlers();
    return this;
  }

  async ensureConfigDirectory() {
    try {
      await fs.mkdir(this.configPath, { recursive: true });
    } catch (error) {
      logger.error('Failed to create config directory:', error);
      throw error;
    }
  }

  async loadAllConfigs() {
    try {
      const files = await fs.readdir(this.configPath);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const configName = path.basename(file, '.json');
          const content = await fs.readFile(path.join(this.configPath, file), 'utf8');
          this.configs.set(configName, JSON.parse(content));
        }
      }
      logger.info('Loaded configurations:', Array.from(this.configs.keys()));
    } catch (error) {
      logger.error('Failed to load configurations:', error);
      throw error;
    }
  }

  setupSocketHandlers() {
    this.io?.on('connection', (socket) => {
      socket.on('config:get', (name, callback) => {
        callback(this.getConfig(name));
      });

      socket.on('config:set', async (name, value, callback) => {
        try {
          await this.setConfig(name, value);
          socket.broadcast.emit('config:updated', { name, value });
          callback({ success: true });
        } catch (error) {
          callback({ success: false, error: error.message });
        }
      });

      socket.on('config:list', (callback) => {
        callback(Array.from(this.configs.entries()));
      });
    });
  }

  getConfig(name) {
    return this.configs.get(name);
  }

  async setConfig(name, value) {
    try {
      await fs.writeFile(
        path.join(this.configPath, `${name}.json`),
        JSON.stringify(value, null, 2)
      );
      this.configs.set(name, value);
      this.notifyWatchers(name, value);
      logger.info(`Configuration updated: ${name}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update configuration ${name}:`, error);
      throw error;
    }
  }

  watch(name, callback) {
    if (!this.watchers.has(name)) {
      this.watchers.set(name, new Set());
    }
    this.watchers.get(name).add(callback);
    return () => this.watchers.get(name).delete(callback);
  }

  notifyWatchers(name, value) {
    if (this.watchers.has(name)) {
      this.watchers.get(name).forEach(callback => callback(value));
    }
  }
}

module.exports = new ConfigurationService();
