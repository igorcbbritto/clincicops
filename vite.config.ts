import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Em desenvolvimento local com Vercel CLI (`vercel dev`), as funções
// de /api/ já rodam automaticamente. Se rodar só com `npm run dev`,
// as chamadas para /api/* retornam 404 — use `vercel dev` localmente.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 5173,
  },
});
