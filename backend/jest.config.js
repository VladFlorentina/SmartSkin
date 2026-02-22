/** @type {import('jest').Config} */
export default {
    testEnvironment: 'node',
    transform: {},
    // Extensii de fisiere pe care Jest le cauta
    moduleFileExtensions: ['js', 'json'],
    // Pattern pentru fisierele de test
    testMatch: ['**/__tests__/**/*.test.js'],
    // Timeout generos pentru teste care acceseaza DB
    testTimeout: 15000,
    // Verbose output pentru claritate in documentatie
    verbose: true
};
