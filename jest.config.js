export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    // Collect coverage for source files and report in lcov + text formats
    collectCoverage: true,
    coverageDirectory: '<rootDir>/coverage',
    coverageReporters: ['text', 'lcov'],
    collectCoverageFrom: [
        'src/**/*.{ts,js}',
        '!src/**/*.d.ts',
        '!src/**/index.{ts,js}'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    transform: {
        "^.+\\.ts$": "ts-jest",                  // TS handled by ts-jest
        "^.+\\.js$": "babel-jest",               // JS (e.g., pify) handled by babel
    },
    transformIgnorePatterns: [
        "/node_modules/(?!(pify)/)",             // transform pify because it's ESM
    ],
    moduleFileExtensions: ['ts', 'js'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};