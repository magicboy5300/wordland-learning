import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { output: { manualChunks: { pinyin: ['pinyin-pro'] } } } },
  server: { port: 5178, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:3001', changeOrigin: false } } },
});
