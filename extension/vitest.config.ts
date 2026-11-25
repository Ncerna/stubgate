import { defineConfig } from 'vitest/config';

// The core has no browser APIs, so its tests run in plain Node.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
