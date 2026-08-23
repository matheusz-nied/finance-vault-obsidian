import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			obsidian: new URL('./tests/mocks/obsidian.ts', import.meta.url).pathname,
		},
	},
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/domain/**/*.ts', 'src/persistence/**/*.ts'],
		},
	},
});
