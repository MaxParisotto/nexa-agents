import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const XtermLogs = ({ logs }) => {
  const terminalRef = useRef(null);
  const terminalInstance = useRef(null);
  const fitAddon = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize terminal
    terminalInstance.current = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      rows: 20,
      cols: 100,
      theme: {
        background: '#1e1e1e',
        foreground: '#f0f0f0',
        cursor: '#f0f0f0',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#e5c07b',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#d0d0d0'
      }
    });

    fitAddon.current = new FitAddon();
    terminalInstance.current.loadAddon(fitAddon.current);
    terminalInstance.current.open(terminalRef.current);
    fitAddon.current.fit();

    // Cleanup
    return () => {
      terminalInstance.current.dispose();
    };
  }, []);

  useEffect(() => {
    if (terminalInstance.current && logs) {
      terminalInstance.current.clear();
      terminalInstance.current.write(logs);
    }
  }, [logs]);

  return (
    <div 
      ref={terminalRef}
      style={{
        height: '400px',
        width: '100%',
        backgroundColor: '#1e1e1e',
        padding: '8px',
        overflow: 'hidden'
      }}
    />
  );
};

export default XtermLogs;
