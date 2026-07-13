import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'apps/**/*.test.ts', 'apps/**/*.test.tsx'],
    exclude: ['out/**', 'node_modules/**', 'src/test/suite/**'],
    environment: 'node',
  },
});
