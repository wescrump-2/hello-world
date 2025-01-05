import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	server: {
		port: 5173,
	},
	build: {
		manifest: true,
		rollupOptions: {
			input: resolve(__dirname, 'index.html'), // Your client entry point
		},
		minify: 'esbuild',
	},
});