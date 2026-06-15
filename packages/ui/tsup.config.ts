import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false, // Temporarily disabled - TypeScript project references issue
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
});
