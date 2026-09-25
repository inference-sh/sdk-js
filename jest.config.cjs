/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // eventsource >=5 ships ESM only; ts-jest emits CommonJS, so let it
  // transform that package instead of requiring the ESM entry as-is.
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs' } }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(?:\\.pnpm/)?eventsource@?)'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types.ts', // Auto-generated
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
};

