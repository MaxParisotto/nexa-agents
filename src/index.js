import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { StyledEngineProvider, GlobalStyles } from '@mui/material';

import App from './App';
import { ThemeContextProvider } from './contexts/ThemeContext';
import reportWebVitals from './reportWebVitals';

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

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      {globalStyles}
      <ThemeContextProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeContextProvider>
    </StyledEngineProvider>
  </React.StrictMode>
);

// Performance measurement
reportWebVitals();
