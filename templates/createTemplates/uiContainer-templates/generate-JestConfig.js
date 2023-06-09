const generateJestConfig = () => `
const config = {
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.{js,jsx}'],
    coverageDirectory: 'coverage',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    transform: {
      '^.+\\.(js|ts)$': 'babel-jest',
    },
  }
  
  export default config
`
module.exports = { generateUiContainerJestConfig: generateJestConfig }
