import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  // Polyfill Node.js globals required by simple-peer
  define: {
    global: 'globalThis',
    'process.env': {},
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },

  optimizeDeps: {
    include: ['simple-peer'],
  },

  build: {
    commonjsOptions: {
      include: [/simple-peer/, /node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('react-router-dom')) return 'react-vendor'
          if (id.includes('socket.io-client')) return 'socket-vendor'
          if (id.includes('framer-motion'))    return 'motion-vendor'
          if (id.includes('firebase'))         return 'firebase-vendor'
        },
      },
    },
    sourcemap: true,
  },
})
