/* eslint-disable */

const generateUiElementPackageJson = (name) => `{
  "name": "${name}",
  "version": "0.0.1",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "webpack-dev-server",
    "build": "webpack --mode production"
  },
  "keywords": [],
  "type": "module",
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "@babel/core": "^7.14.3",
    "@babel/preset-react": "^7.13.13",
    "babel-loader": "^8.2.2",
    "css-loader": "^6.2.0",
    "dotenv": "^16.0.0",
    "html-webpack-plugin": "^5.3.1",
    "style-loader": "^3.2.1",
    "url-loader": "^4.1.1",
    "webpack": "^5.52.0",
    "webpack-cli": "^4.10.0",
    "webpack-dev-server": "^4.1.0",
    "@appblocks/node-sdk": "^0.0.3",
    "@module-federation/fmr": "^0.0.7",
  },
  "dependencies": {
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
        "@appblocks/js-sdk": "^0.0.2"
  }
}
`

module.exports = { generateUiElementPackageJson }
