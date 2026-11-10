module.exports = {
  preset: 'ts-jest',
  roots: ['<rootDir>'],
  testEnvironment: 'node',
  // main.ts loads .env via dotenv before bootstrapping; Jest never goes
  // through main.ts, so without this any test that instantiates a
  // provider depending on real env vars (e.g. CryptoService needing
  // ENCRYPTION_IV) fails outside a shell that happens to export them.
  setupFiles: ['dotenv/config'],
  testPathIgnorePatterns: ['node_modules/*', 'dist/*'],
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  restoreMocks: true,
  resetMocks: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'lcov'],
  reporters: ['default', 'jest-junit'],
  coveragePathIgnorePatterns: ['node_modules', 'test'],
  clearMocks: true,
  moduleNameMapper: {
    '^@/(.*)': ['<rootDir>/src/$1'],
    '^@application/(.*)': ['<rootDir>/src/application/$1'],
    '^@contexts/(.*)': ['<rootDir>/src/contexts/$1'],
    '^@shared/(.*)': ['<rootDir>/src/contexts/shared/$1'],
    '^@test/(.*)': ['<rootDir>/test/$1'],
  },
  collectCoverageFrom: [
    '<rootDir>/src/**',
    '!**/node_modules/**',
    '!<rootDir>/src/**.ts',
    '!<rootDir>/src/**/dto/**',
    '!<rootDir>/src/**/types/**',
    '!<rootDir>/src/**/model/**',
    '!<rootDir>/src/**/infrastructure/**.ts',
  ],
};
