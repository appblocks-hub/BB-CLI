const { generateUiContainerAppJs } = require('./generate-appJs')
const { generateUiContainerBootstrapJs } = require('./generate-bootstrapJs')
const { generateUiContainerIndexHtml } = require('./generate-indexHtml')
const { generateUiContainerIndexJs } = require('./generate-indexJs')
const { generateUiContainerPackageJson } = require('./generate-packageJson')
const { generateUiContainerStoreJs } = require('./generate-store')
const { generateUiContainerSystemJs } = require('./generate-systemJs')
const { generateUiContainerWebpack } = require('./generate-webpackConfig')

module.exports = {
  generateUiContainerIndexHtml,
  generateUiContainerWebpack,
  generateUiContainerStoreJs,
  generateUiContainerIndexJs,
  generateUiContainerBootstrapJs,
  generateUiContainerAppJs,
  generateUiContainerPackageJson,
  generateUiContainerSystemJs,
}
