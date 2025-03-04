import React, { useState } from 'react';
import { useUplink } from './UplinkContext';
import axios from 'axios';

const UplinkConfig = () => {
  const { config, setConfig } = useUplink();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Initialize default config if not provided
  const [localConfig, setLocalConfig] = useState({
    websocket: config?.websocket || {
      host: 'localhost',
      port: 8081,
      enabled: true
    },
    rest: config?.rest || {
      host: 'localhost',
      port: 3000,
      enabled: true
    }
  });

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      // Save configuration to backend
      const response = await axios.post('/api/uplink/config', localConfig);
      
      // Update global config state
      setConfig(response.data);
      
      // Restart WebSocket server with new configuration
      await axios.post('/api/uplink/restart');
    } catch (err) {
      setError('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (type, field, value) => {
    setLocalConfig(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  return (
    <div className="uplink-config">
      <h3>WebSocket Configuration</h3>
      <div className="config-item">
        <label>Host:</label>
        <input 
          type="text" 
          value={localConfig.websocket.host}
          onChange={(e) => handleChange('websocket', 'host', e.target.value)}
        />
      </div>
      <div className="config-item">
        <label>Port:</label>
        <input 
          type="number" 
          value={localConfig.websocket.port}
          onChange={(e) => handleChange('websocket', 'port', e.target.value)}
        />
      </div>
      <div className="config-item">
        <label>Enabled:</label>
        <input 
          type="checkbox" 
          checked={localConfig.websocket.enabled}
          onChange={(e) => handleChange('websocket', 'enabled', e.target.checked)}
        />
      </div>

      <h3>REST API Configuration</h3>
      <div className="config-item">
        <label>Host:</label>
        <input 
          type="text" 
          value={localConfig.rest.host}
          onChange={(e) => handleChange('rest', 'host', e.target.value)}
        />
      </div>
      <div className="config-item">
        <label>Port:</label>
        <input 
          type="number" 
          value={localConfig.rest.port}
          onChange={(e) => handleChange('rest', 'port', e.target.value)}
        />
      </div>
      <div className="config-item">
        <label>Enabled:</label>
        <input 
          type="checkbox" 
          checked={localConfig.rest.enabled}
          onChange={(e) => handleChange('rest', 'enabled', e.target.checked)}
        />
      </div>

      {error && <div className="error-message">{error}</div>}
      
      <button 
        onClick={handleSave}
        disabled={isSaving}
        className="save-button"
      >
        {isSaving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>
  );
};

export default UplinkConfig;
