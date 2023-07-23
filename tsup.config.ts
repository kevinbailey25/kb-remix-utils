import { defineConfig } from 'tsup'

export default defineConfig(options => ({
	...options,
	clean: true,
	dts: true,
	entry: ['src/index.ts'],
	format: ['cjs', 'esm'],
	metafile: false,
	replaceNodeEnv: false,
	sourcemap: false,
	splitting: false,
}))
