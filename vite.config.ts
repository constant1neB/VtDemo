import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: 'localhost',
    https: {
      key: fs.readFileSync('C:/Users/John Doe/mkcert/example.com+5-key.pem'),
      cert: fs.readFileSync('C:/Users/John Doe/mkcert/example.com+5.pem'),
    },
  },
});