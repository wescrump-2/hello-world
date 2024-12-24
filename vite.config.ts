import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	publicDir: 'public',
	server: {
		port: 5173,
	},
	build: {
		outDir: resolve(__dirname, 'dist/client'),
		rollupOptions: {
			input: resolve(__dirname, 'src/client/main.ts'), // Your client entry point
		},
		minify: 'esbuild',
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
		},
	},
});