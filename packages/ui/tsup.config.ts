import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  async onSuccess() {
    // Generate types manually with tsc
    const { execSync } = await import('child_process');
    console.log('Generating types...');
    execSync('npx tsc --emitDeclarationOnly --declaration --declarationMap', { stdio: 'inherit' });
    console.log('Types generated successfully');
  },
});
