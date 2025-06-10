import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        includeSource: ['**/*.{js,ts}'],
        exclude: ['**/node_modules/**', '**/dist/**'],
    },
})
