export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
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