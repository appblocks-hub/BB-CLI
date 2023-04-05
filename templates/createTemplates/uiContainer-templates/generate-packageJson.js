/* eslint-disable */

const generateUiContainerPackageJson = (name) => `
{
  "name": "${name}",
  "main": "index.js",
  "license": "ISC",
  "type": "module",
  "scripts": {
    "start": "webpack-dev-server",
    "build": "webpack --mode production",
    "serve": "webpack-cli serve",
    "clean": "rm -rf dist",
    "prepare": "npx husky install",
    "test": "npx jest",
    "lint": "npx eslint *.js",
    "lint:fix": "npx eslint *.js --fix",
    "format": "npx prettier ./**/*{.js,.json} --write",
    "pre-commit": "npx lint-staged"
  },
  "lint-staged": {
    "*.js": [
      "npm run lint:fix",
      "npm run format"
    ]
  },
  "dependencies": {
    "@appblocks/js-sdk": "^0.0.11",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-error-boundary": "^3.1.4",
    "react-query": "^3.39.2",
    "react-redux": "^7.2.5",
    "react-router-dom": "^6.9.0",
    "redux": "^4.1.2",
    "state-pool": "^0.8.1"
  },
  "devDependencies": {
    "@appblocks/node-sdk": "0.0.4",
    "@babel/core": "7.15.0",
    "@babel/eslint-parser": "^7.21.3",
    "@babel/preset-react": "^7.14.5",
    "@commitlint/cli": "^15.0.0",
    "@commitlint/config-conventional": "^15.0.0",
    "@types/eslint": "7.28.1",
    "@types/jest": "27.4.0",
    "@types/node": "16.9.6",
    "babel-loader": "8.2.2",
    "dotenv": "^16.0.0",
    "eslint": "8.13.0",
    "eslint-config-airbnb-base": "15.0.0",
    "eslint-config-prettier": "8.3.0",
    "eslint-plugin-import": "2.25.2",
    "eslint-plugin-react": "^7.32.2",
    "html-webpack-plugin": "5.3.2",
    "husky": "^7.0.0",
    "jest": "27.4.3",
    "lint-staged": "11.2.3",
    "prettier": "2.4.1",
    "serve": "12.0.0",
    "url-loader": "^4.1.1",
    "webpack": "5.52.0",
    "webpack-cli": "4.10.0",
    "webpack-dev-server": "4.1.0"
  }
}
  `

module.exports = { generateUiContainerPackageJson }
