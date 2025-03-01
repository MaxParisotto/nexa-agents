import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm'; 
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useSettings } from './SettingsContext';

const SettingsTerminal = () => {
  const terminalRef = useRef(null);
  const fitAddon = useRef(null);
  const terminal = useRef(null);
  const { state } = useSettings();
  const ws = useRef(null);

  useEffect(() => {
    // Initialize the terminal only if the ref exists
    if (terminalRef.current) {
      // Create new instances for each render to avoid stale references
      fitAddon.current = new FitAddon();
      terminal.current = new Terminal({
        cursorBlink: true,
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff'
        }
      });

      try {
        terminal.current.loadAddon(fitAddon.current);
        terminal.current.open(terminalRef.current);
        
        // Wait for next tick to ensure the terminal is fully initialized
        setTimeout(() => {
          if (fitAddon.current) {
            try {
              fitAddon.current.fit();
            } catch (e) {
              console.warn('Error resizing terminal:', e);
            }
          }
        }, 100);
        
        // Add some sample content
        terminal.current.writeln('Welcome to Nexa Terminal');
        terminal.current.writeln('---------------------------');
        terminal.current.writeln('Type "help" for available commands');
      } catch (err) {
        console.error('Error initializing terminal:', err);
      }
    }

    // Clean up
    return () => {
      if (terminal.current) {
        try {
          terminal.current.dispose();
        } catch (e) {
          console.warn('Error disposing terminal:', e);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!state.openai.enabled || !state.openai.websocketUrl) return;

    const connectWebSocket = () => {
      ws.current = new WebSocket(state.openai.websocketUrl);

      ws.current.onopen = () => {
        console.log('WebSocket connection established');
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'output') {
          terminalRef.current.write(data.content);
        }
      };

      ws.current.onclose = () => {
        console.log('WebSocket connection closed');
        setTimeout(connectWebSocket, 5000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [state.openai.websocketUrl, state.openai.enabled]);

  return (
    <div 
      ref={terminalRef}
      style={{
        width: '100%',
        height: '400px',
        backgroundColor: '#1e1e1e',
        padding: '10px',
        borderRadius: '4px'
      }}
    />
  );
};

export default SettingsTerminal;
