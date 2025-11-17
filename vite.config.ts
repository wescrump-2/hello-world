import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'path';
import fs from 'fs'

export default defineConfig({
	root:'./',
	plugins: [basicSsl()],
	server: {
		hmr: { clientPort: 443 },
		https: {
      		key: fs.readFileSync('./localhost+2-key.pem'),
      		cert: fs.readFileSync('./localhost+2.pem'),
    	},
		cors: true,
		port: 5173,
	},
	build: {
		manifest: true,
		outDir: 'dist',
		rollupOptions: {
			input: resolve(__dirname, 'index.html'), // Your client entry point
		},
		minify: 'esbuild',
		sourcemap: true,
	},
});
