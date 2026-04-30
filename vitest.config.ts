import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/features/**/__tests__/*.test.ts', 'src/shared/**/__tests__/*.test.ts'],
    exclude: ['out/**', 'node_modules/**', 'src/test/suite/**'],
    environment: 'node',
  },
});
