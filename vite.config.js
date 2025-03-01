import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import checker from 'vite-plugin-checker'

export default defineConfig({
  resolve: {
    extensions: [
      '.js',
      '.jsx'
    ]
  },
  plugins: [
    react(),
    svgr(),
    checker({ typescript: true })
  ],
  server: {
    port: 3000,
    host: 'localhost',
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/index.jsx'
    }
  }
})
