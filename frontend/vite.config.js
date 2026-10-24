import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8085',
      '/wallets': 'http://localhost:8085',
      '/transfers': 'http://localhost:8085',
      '/webhooks': 'http://localhost:8085',
      '/recon': 'http://localhost:8085',
      '/actuator': 'http://localhost:8085',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});
