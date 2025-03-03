import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { StyledEngineProvider, GlobalStyles } from '@mui/material';

import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';

// Global styles to fix MUI integration issues
const globalStyles = (
  <GlobalStyles
    styles={{
      'html, body, #root': {
        height: '100%',
        margin: 0,
        padding: 0,
      },
      '.MuiBox-root': {
        display: 'flex',
        flexDirection: 'column',
      },
      // Fix for Toolbar and content alignment issues
      '.MuiToolbar-root + .MuiBox-root': {
        width: '100%',
      }
    }}
  />
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      {globalStyles}
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>
);
