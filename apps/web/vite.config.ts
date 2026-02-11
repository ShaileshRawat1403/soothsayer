import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@soothsayer/types': path.resolve(__dirname, '../../packages/types/src'),
      '@soothsayer/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@soothsayer/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: 'all',
    hmr: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        timeout: 600000,
        proxyTimeout: 600000,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        timeout: 600000,
        proxyTimeout: 600000,
      },
    },
  },
  preview: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
