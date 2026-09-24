module.exports = {

  //exec environment setting
  testEnvironment: 'node',
  //to detect test files
  testMatch: ['**/tests/**/*.test.js'],

  //for test execution output
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: 'test-results', outputName: 'junit.xml' }]
  ],
  collectCoverage: true,
  //source files to include in coverage
  collectCoverageFrom: [
    'controllers/**/*.js',
    'models/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  //threshold settings that jest fails if coverage is not met
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  }
};
