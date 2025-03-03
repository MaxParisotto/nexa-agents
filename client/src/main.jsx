import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { SocketProvider } from './services/socket-service';
import './styles/index.css';

// Error boundary to catch rendering errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Render error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '2rem', 
          margin: '2rem auto', 
          maxWidth: '800px',
          backgroundColor: '#ffebee',
          border: '1px solid #ef9a9a',
          borderRadius: '8px'
        }}>
          <h2>Something went wrong</h2>
          <p>The application encountered an error. Please try refreshing the page.</p>
          <pre style={{ 
            overflow: 'auto', 
            padding: '1rem', 
            backgroundColor: '#fff', 
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#d32f2f',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Root component with providers
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <SocketProvider>
            <App />
          </SocketProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
