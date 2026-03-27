/// <reference types="vitest/config" />

import { dirname, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { bundleDts } from "vite-plugin-bundle-dts";
import { playwright } from "@vitest/browser-playwright";
import packageJson from "./package.json";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react(), bundleDts({ rollupTypes: true, logLevel: "error" })],
	build: {
		// NOTE(joel): Don't minify, because every consumer will minify themselves
		// anyway. We're only bundling for the sake of publishing to npm.
		minify: false,
		lib: {
			entry: resolve(__dirname, packageJson.source),
			formats: ["cjs", "es"],
			fileName: parse(packageJson.module).name,
		},
		rollupOptions: {
			// NOTE(joel): Make sure to externalize deps that shouldn't be bundled
			// into your library
			external: ["react", "react/jsx-runtime", "react-dom"],
		},
	},
	test: {
		browser: {
			enabled: true,
			headless: true,
			screenshotFailures: false,
			provider: playwright(),
			instances: [{ browser: "chromium" }],
		},
	},
});
