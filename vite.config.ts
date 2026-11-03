import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset paths, so `dist/` works when published as an artifact (ticket 10) as well as from localhost.
  base: './',
  server: { port: 5173, strictPort: true },
});
