const { generateUiElementAppJs } = require('./generate-appJs')
const { generateUiElementBootstrapJs } = require('./generate-bootstrapJs')
const { generateUiElementIndexJs } = require('./generate-indexJs')
const { generateUiElementPackageJson } = require('./generate-packageJson')
const { generateUiElementJs } = require('./generate-uiElementJs')
const { generateUiElementWebpack } = require('./generate-webpackConfig')
const { generateUiElementIndexHtml } = require('./generateIndexHtml')

module.exports = {
  generateUiElementIndexHtml,
  generateUiElementJs,
  generateUiElementWebpack,
  generateUiElementIndexJs,
  generateUiElementPackageJson,
  generateUiElementBootstrapJs,
  generateUiElementAppJs,
}
