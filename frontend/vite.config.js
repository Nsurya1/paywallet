import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8080',
      '/wallets': 'http://localhost:8080',
      '/transfers': 'http://localhost:8080',
      '/webhooks': 'http://localhost:8080',
      '/recon': 'http://localhost:8080',
      '/actuator': 'http://localhost:8080',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
});
