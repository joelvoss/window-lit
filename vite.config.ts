/// <reference types="vitest" />

import { resolve, parse, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import packageJson from './package.json';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react(), dts({ rollupTypes: true, logLevel: 'error' })],
	build: {
    // NOTE(joel): Don't minify, because every consumer will minify themselves
    // anyway. We're only bundling for the sake of publishing to npm.
    minify: false,
		lib: {
      entry: resolve(__dirname, packageJson.source),
			formats: ['cjs', 'es'],
			fileName: parse(packageJson.module).name,
		},
		rollupOptions: {
			// NOTE(joel): Make sure to externalize deps that shouldn't be bundled
			// into your library
			external: ['react', 'react/jsx-runtime', 'react-dom'],
		},
	},
	test: {
    environment: 'jsdom',
    setupFiles: resolve(__dirname, './tests/setup.ts'),
	},
});
