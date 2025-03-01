import React, { useState } from 'react';
import UplinkContext from './UplinkContext';

const UplinkProvider = ({ children }) => {
  const [config, setConfig] = useState({
    websocket: {
      host: process.env.REACT_APP_WS_HOST || 'localhost',
      port: process.env.REACT_APP_WS_PORT || 8080,
      enabled: true
    },
    rest: {
      host: process.env.REACT_APP_API_HOST || 'localhost',
      port: process.env.REACT_APP_API_PORT || 3000,
      enabled: true
    }
  });

  return (
    <UplinkContext.Provider value={{ config, setConfig }}>
      {children}
    </UplinkContext.Provider>
  );
};

export default UplinkProvider;
