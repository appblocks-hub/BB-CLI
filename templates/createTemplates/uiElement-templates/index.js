const { generateUiElementAppJs } = require('./generate-appJs')
const { generateUiElementBootstrapJs } = require('./generate-bootstrapJs')
const { generateUiElementIndexJs } = require('./generate-indexJs')
const { generateUiElementPackageJson } = require('./generate-packageJson')
const { generateUiElementsReadme } = require('./generate-readme')
const { generateUiElementJs } = require('./generate-uiElementJs')
const { generateUiElementWebpack } = require('./generate-webpackConfig')
const { generateUiElementIndexHtml } = require('./generateIndexHtml')
const { generateUiElementFederationExpose } = require('./generate-federation-exposeJs')
const { generateLayoutTemplateJs } = require('./generate-layout-template')
const { generateHeaderTemplateJs } = require('./generate-header-template')
const { generateSidebarTemplateJs } = require('./generate-sidebar-template')

module.exports = {
  generateUiElementIndexHtml,
  generateUiElementJs,
  generateUiElementWebpack,
  generateUiElementIndexJs,
  generateUiElementPackageJson,
  generateUiElementBootstrapJs,
  generateUiElementAppJs,
  generateUiElementsReadme,
  generateUiElementFederationExpose,
  generateLayoutTemplateJs,
  generateHeaderTemplateJs,
  generateSidebarTemplateJs,
}
