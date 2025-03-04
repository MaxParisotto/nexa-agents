import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Box, useTheme } from '@mui/material';
import '@xterm/xterm/css/xterm.css';

/**
 * XtermLogs component - Displays logs in a terminal-like interface
 * 
 * @param {Object} props - Component props
 * @param {string} props.logs - Log content to display
 */
const XtermLogs = ({ logs }) => {
  const theme = useTheme();
  const terminalRef = useRef(null);
  const terminalInstance = useRef(null);
  const fitAddon = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef(null);

  // Initialize terminal on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const initTerminal = () => {
      try {
        // Initialize terminal with proper dimensions
        const { offsetWidth, offsetHeight } = containerRef.current;
        const cols = Math.floor((offsetWidth - 20) / 9); // Approximate character width
        const rows = Math.floor((offsetHeight - 20) / 20); // Approximate line height

        terminalInstance.current = new Terminal({
          cursorBlink: false,
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          rows: Math.max(rows, 10),
          cols: Math.max(cols, 40),
          theme: {
            background: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
            foreground: theme.palette.mode === 'dark' ? '#f0f0f0' : '#000000',
            cursor: theme.palette.mode === 'dark' ? '#f0f0f0' : '#000000',
            selection: 'rgba(128, 128, 128, 0.3)',
            black: '#000000',
            red: theme.palette.error.main,
            green: theme.palette.success.main,
            yellow: theme.palette.warning.main,
            blue: theme.palette.info.main,
            magenta: '#c678dd',
            cyan: '#56b6c2',
            white: theme.palette.mode === 'dark' ? '#d0d0d0' : '#000000'
          },
          allowTransparency: true,
          scrollback: 5000
        });

        fitAddon.current = new FitAddon();
        terminalInstance.current.loadAddon(fitAddon.current);
        
        if (terminalRef.current) {
          terminalInstance.current.open(terminalRef.current);
          fitAddon.current.fit();
          setIsReady(true);
        }
      } catch (error) {
        console.error('Error initializing terminal:', error);
      }
    };

    // Wait for container to be properly sized
    const resizeObserver = new ResizeObserver(() => {
      if (terminalInstance.current && fitAddon.current) {
        try {
          fitAddon.current.fit();
        } catch (error) {
          console.warn('Error fitting terminal:', error);
        }
      } else {
        initTerminal();
      }
    });

    resizeObserver.observe(containerRef.current);

    // Handle window resize
    const handleResize = () => {
      if (fitAddon.current && terminalInstance.current) {
        try {
          fitAddon.current.fit();
        } catch (error) {
          console.warn('Error fitting terminal:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (terminalInstance.current) {
        try {
          terminalInstance.current.dispose();
        } catch (error) {
          console.warn('Error disposing terminal:', error);
        }
      }
    };
  }, [theme.palette.mode]);

  // Update terminal content when logs change
  useEffect(() => {
    if (terminalInstance.current && logs && isReady) {
      try {
        terminalInstance.current.clear();
        
        // Apply color formatting for different log levels
        const lines = logs.split('\n');
        lines.forEach(line => {
          let formattedLine = line;
          
          // Add newline if not present
          if (!formattedLine.endsWith('\n')) {
            formattedLine += '\r\n';
          }

          if (line.includes('[ERROR]')) {
            terminalInstance.current.write('\x1b[31m' + formattedLine + '\x1b[0m');
          } else if (line.includes('[WARN]')) {
            terminalInstance.current.write('\x1b[33m' + formattedLine + '\x1b[0m');
          } else if (line.includes('[INFO]')) {
            terminalInstance.current.write('\x1b[36m' + formattedLine + '\x1b[0m');
          } else if (line.includes('[DEBUG]')) {
            terminalInstance.current.write('\x1b[90m' + formattedLine + '\x1b[0m');
          } else {
            terminalInstance.current.write(formattedLine);
          }
        });

        // Scroll to bottom
        terminalInstance.current.scrollToBottom();
      } catch (error) {
        console.warn('Error updating terminal content:', error);
      }
    }
  }, [logs, isReady]);

  return (
    <Box
      ref={containerRef}
      sx={{
        height: '500px',
        width: '100%',
        backgroundColor: theme => theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
        padding: '8px',
        overflow: 'hidden',
        borderRadius: '4px',
        position: 'relative'
      }}
    >
      <Box
        ref={terminalRef}
        sx={{
          height: '100%',
          width: '100%',
          '& .xterm': {
            height: '100%',
            width: '100%',
            padding: '4px'
          },
          '& .xterm-viewport': {
            overflow: 'auto !important'
          }
        }}
      />
    </Box>
  );
};

export default XtermLogs;
