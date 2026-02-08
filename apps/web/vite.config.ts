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
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: 'all',
    hmr: {
      clientPort: 443,
      protocol: 'wss',
      host: '3000-iwwnvyxrdr4iv6ajsfqja-cbeee0f9.sandbox.novita.ai',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
  preview: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
