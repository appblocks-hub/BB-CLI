const { generateUiContainerAppJs } = require('./generate-appJs')
const { generateUiContainerBootstrapJs } = require('./generate-bootstrapJs')
const { generateUiContainerIndexHtml } = require('./generate-indexHtml')
const { generateUiContainerIndexJs } = require('./generate-indexJs')
const { generateUiContainerPackageJson } = require('./generate-packageJson')
const { generateUiContainerReadme } = require('./generate-readme')
const { generateUiContainerWebpack } = require('./generate-webpackConfig')
const { generateUiContainerLayout } = require('./generate-layout')
const { generateUiContainerAppRoute } = require('./generate-appRoute')

module.exports = {
  generateUiContainerIndexHtml,
  generateUiContainerWebpack,
  generateUiContainerIndexJs,
  generateUiContainerBootstrapJs,
  generateUiContainerAppJs,
  generateUiContainerPackageJson,
  generateUiContainerReadme,
  generateUiContainerLayout,
  generateUiContainerAppRoute,
}
