import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr(), // Convert SVG to React components
    // Temporarily disabling the ESLint checker until we've fixed all ESLint issues
    // checker({
    //   typescript: true,
    //   eslint: {
    //     lintCommand: 'eslint "./src/**/*.{js,jsx}"',
    //   },
    // }),
    visualizer({ // Bundle visualizer - creates stats.html
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    port: 3000,
    open: true,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000, // Increased limit for bigger chunks
  },
  resolve: {
    alias: {
      // Add any path aliases here
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      'axios',
    ],
  },
});
