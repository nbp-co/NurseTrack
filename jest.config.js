/** @type {import('jest').Config} */
export default {
  projects: [
    // Backend tests configuration
    {
      displayName: 'backend',
      preset: 'ts-jest/presets/default-esm',
      extensionsToTreatAsEsm: ['.ts'],
      testEnvironment: 'node',
      roots: ['<rootDir>/tests', '<rootDir>/server'],
      testMatch: [
        '**/tests/**/*.test.ts',
        '**/tests/**/*.spec.ts',
        '**/server/**/*.test.ts'
      ],
      transform: {
        '^.+\\.ts$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            module: 'ESNext',
            moduleResolution: 'node'
          }
        }]
      },
      moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/shared/$1',
        '^@/(.*)$': '<rootDir>/client/src/$1'
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      collectCoverageFrom: [
        'server/services/**/*.ts',
        'server/routes.ts',
        '!**/node_modules/**',
        '!**/tests/**',
        '!**/*.test.ts'
      ],
      coverageThreshold: {
        './server/services/contracts.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80
        },
        './server/routes.ts': {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80
        }
      },
      coverageReporters: ['text', 'lcov', 'html'],
      coverageDirectory: '<rootDir>/coverage/backend',
      detectOpenHandles: true
    },
    // Frontend tests configuration
    {
      displayName: 'frontend',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/client/src'],
      testMatch: [
        '<rootDir>/client/src/**/*.test.{ts,tsx}'
      ],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx'
          }
        }]
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/client/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
      },
      setupFilesAfterEnv: ['<rootDir>/client/src/test/setup.ts'],
      collectCoverageFrom: [
        'client/src/**/*.{ts,tsx}',
        '!client/src/**/*.test.{ts,tsx}',
        '!client/src/test/**/*',
        '!client/src/main.tsx',
        '!client/src/vite-env.d.ts'
      ],
      coverageThreshold: {
        global: {
          lines: 60,
          functions: 60,
          branches: 60,
          statements: 60
        },
        // Calendar components must have >= 75% coverage
        'client/src/components/calendar/*.{ts,tsx}': {
          lines: 75,
          functions: 75,
          branches: 70,
          statements: 75
        },
        // Time utilities must have >= 90% coverage
        'client/src/lib/time.ts': {
          lines: 90,
          functions: 90,
          branches: 85,
          statements: 90
        }
      },
      coverageReporters: ['text', 'lcov', 'html'],
      coverageDirectory: '<rootDir>/coverage/frontend',
      testEnvironmentOptions: {
        customExportConditions: ['']
      }
    }
  ],
  // Global settings
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  verbose: true
};