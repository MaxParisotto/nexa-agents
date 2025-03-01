import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { useSettings } from './SettingsContext';

export const SettingsTerminal = () => {
  const terminalRef = useRef(null);
  const fitAddon = useRef(new FitAddon());
  const { state } = useSettings();
  const ws = useRef(null);

  useEffect(() => {
    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff'
      }
    });

    terminal.loadAddon(fitAddon.current);
    terminal.open(terminalRef.current);
    fitAddon.current.fit();

    const handleResize = () => {
      fitAddon.current.fit();
      if (ws.current?.readyState === WebSocket.OPEN) {
        const { cols, rows } = terminal;
        ws.current.send(JSON.stringify({ type: 'resize', cols, rows }));
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
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
