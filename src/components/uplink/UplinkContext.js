import { createContext, useContext } from 'react';

const UplinkContext = createContext({
  websocketConfig: {
    host: 'localhost',
    port: 8080,
    enabled: true
  },
  restConfig: {
    host: 'localhost',
    port: 3000,
    enabled: true
  }
});

export const useUplink = () => useContext(UplinkContext);

export default UplinkContext;
