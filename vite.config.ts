import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig(({ command, mode }) => {
  const isDev = mode === 'development' && command === 'serve';  // Only dev server

  return {
    root: './',
    plugins: [basicSsl()],  // Keep plugin, but conditional config below
    server: isDev ? {  // ← NEW: Conditional server config
      host: 'localhost',
      hmr: { clientPort: 443 },
      https: {
        key: fs.readFileSync('./localhost+2-key.pem'),
        cert: fs.readFileSync('./localhost+2.pem'),
      },
      cors: true,
      port: 5173,

    } : {},  // Empty for build (no HTTPS)
    build: {
      manifest: true,
      outDir: 'dist',
      rollupOptions: {
        input: resolve(__dirname, 'index.html'),
      },
      minify: 'esbuild',
      sourcemap: true,
    },
  };
});