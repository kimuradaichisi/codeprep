import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'], // これにより src 以下の全ての .test.ts が対象になります
    exclude: ['out/**', 'node_modules/**', 'src/test/suite/**'],
    environment: 'node',
  },
});
