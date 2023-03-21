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
      "clean": "rm -rf dist"
    },
    "dependencies": {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-redux": "^7.2.5",
      "@appblocks/js-sdk": "^0.0.11",
		  "react-router-dom": "^6.9.0",
		  "react-query": "^3.39.2",
		  "redux": "^4.1.2",
		  "react-error-boundary": "^3.1.4",
		  "state-pool": "^0.8.1"
    },
    "devDependencies": {
      "@babel/core": "7.15.0",
      "@babel/preset-react": "7.14.5",
      "babel-loader": "8.2.2",
      "dotenv": "^16.0.0",
      "html-webpack-plugin": "5.3.2",
      "serve": "12.0.0",
      "url-loader": "^4.1.1",
      "webpack": "5.52.0",
      "webpack-cli": "4.10.0",
      "webpack-dev-server": "4.1.0",
      "@appblocks/node-sdk": "0.0.4"
    }
  }
  `

module.exports = { generateUiContainerPackageJson }
