import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so scripts/to-artifact.mjs can find and inline them.
  base: './',
});
