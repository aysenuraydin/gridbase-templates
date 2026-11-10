import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 5173: gridbase.config.ts'teki CORS adresi (http://localhost:5173) buna göre. Değiştirirsen ikisini birden değiştir.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
