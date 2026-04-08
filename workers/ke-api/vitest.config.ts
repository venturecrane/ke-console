import { defineConfig } from 'vitest/config'

/**
 * ke-api test layout:
 *
 *   - unit    — existing unit tests colocated in src/**\/*.test.ts
 *   - harness — migration + D1 tests via @venturecrane/crane-test-harness
 *
 * Default `npm test` runs unit + harness.
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/__tests__/**'],
    },
    projects: [
      {
        test: {
          name: 'unit',
          globals: false,
          environment: 'node',
          include: ['src/**/*.test.ts'],
          exclude: ['test/harness/**'],
        },
      },
      {
        test: {
          name: 'harness',
          environment: 'node',
          include: ['test/harness/**/*.test.ts'],
        },
      },
    ],
  },
})
