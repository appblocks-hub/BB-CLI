/* eslint-disable */

const generateUiElementPackageJson = (name) => `{
  "name": "${name}",
  "main": "index.js",
  "type": "module",
  "license": "ISC", 
  "scripts": {
    "start": "webpack-dev-server",
    "build": "webpack --mode production",
    "prepare": "npx husky install",
    "test": "npx jest",
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
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-redux": "^7.2.5",
    "@appblocks/js-sdk": "^0.0.11",
    "sass": "^1.32.2",
    "sass-loader": "^10.1.0",
    "react-router-dom": "^6.9.0",
    "react-query": "^3.39.2",
    "redux": "^4.1.2",
    "state-pool": "^0.8.1"
  },
  "devDependencies": {
    "@types/eslint":"7.28.1",
    "@types/jest":"27.4.0",
    "jest":"27.4.3",
    "eslint":"8.13.0", 
    "eslint-config-airbnb-base": "15.0.0",
    "eslint-config-prettier": "8.3.0",
    "eslint-plugin-import": "2.25.2",
    "husky":"7.0.0",
    "lint-staged":"11.2.3",
    "prettier":"2.4.1",
    "@commitlint/cli": "15.0.0",
    "@commitlint/config-conventional": "15.0.0",
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

module.exports = { generateUiElementPackageJson }
