import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	build: {
		ssr: 'src/server/server.ts', // Entry point for server-side rendering
		outDir: 'dist/server',
		rollupOptions: {
			input: resolve(__dirname, 'src/server/server.ts'),
			output: {
				format: 'cjs',
				dir: 'dist/server',
			},
		},
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
		},
	},
	server: {
		host: true, // Listen on all addresses
	},
});