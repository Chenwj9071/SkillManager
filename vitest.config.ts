import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'api',
          environment: 'node',
          include: ['apps/api/src/**/*.test.ts']
        }
      },
      {
        test: {
          name: 'shared',
          environment: 'node',
          include: ['packages/shared/src/**/*.test.ts']
        }
      },
      {
        test: {
          name: 'web',
          environment: 'jsdom',
          setupFiles: ['apps/web/src/test/setup.ts'],
          include: ['apps/web/src/**/*.test.ts', 'apps/web/src/**/*.test.tsx']
        }
      }
    ]
  }
});
