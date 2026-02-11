import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  treeshake: true,
  external: ['react', 'firebase', 'firebase/app', 'firebase/firestore', 'firebase/auth'],
});
