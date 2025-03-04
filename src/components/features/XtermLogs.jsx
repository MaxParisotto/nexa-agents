import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

/**
 * XtermLogs component - Displays logs in a terminal-like interface
 * 
 * @param {Object} props - Component props
 * @param {string} props.logs - Log content to display
 */
const XtermLogs = ({ logs }) => {
  const terminalRef = useRef(null);
  const terminalInstance = useRef(null);
  const fitAddon = useRef(null);

  // Initialize terminal on mount
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

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current) {
        fitAddon.current.fit();
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (terminalInstance.current) {
        terminalInstance.current.dispose();
      }
    };
  }, []);

  // Update terminal content when logs change
  useEffect(() => {
    if (terminalInstance.current && logs) {
      terminalInstance.current.clear();
      
      // Apply color formatting for different log levels
      const lines = logs.split('\n');
      lines.forEach(line => {
        if (line.includes('[ERROR]')) {
          terminalInstance.current.write('\x1b[31m' + line + '\x1b[0m\r\n'); // Red
        } else if (line.includes('[WARN]')) {
          terminalInstance.current.write('\x1b[33m' + line + '\x1b[0m\r\n'); // Yellow
        } else if (line.includes('[INFO]')) {
          terminalInstance.current.write('\x1b[36m' + line + '\x1b[0m\r\n'); // Cyan
        } else if (line.includes('[DEBUG]')) {
          terminalInstance.current.write('\x1b[90m' + line + '\x1b[0m\r\n'); // Gray
        } else {
          terminalInstance.current.write(line + '\r\n');
        }
      });
    }
  }, [logs]);

  return (
    <div 
      ref={terminalRef}
      style={{
        height: '500px',
        width: '100%',
        backgroundColor: '#1e1e1e',
        padding: '8px',
        overflow: 'hidden',
        borderRadius: '4px'
      }}
    />
  );
};

export default XtermLogs;
