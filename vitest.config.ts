import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/tests/unit/**/*.test.ts'],
    exclude: ['out/**', 'node_modules/**', 'src/test/suite/**'],
    environment: 'node',
  },
});
