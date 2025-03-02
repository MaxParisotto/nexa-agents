import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import checker from 'vite-plugin-checker'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  resolve: {
    extensions: [
      '.js',
      '.jsx'
    ],
    alias: {
      '@': '/src',
    }
  },
  plugins: [
    react(),
    svgr(),
    checker({ typescript: true }),
    // Add visualizer for bundle analysis
    visualizer({
      filename: './dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    port: 3000,
    host: 'localhost',
    strictPort: true,
    historyApiFallback: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: 'src/index.jsx',
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        warn(warning);
      }
    }
  }
})
