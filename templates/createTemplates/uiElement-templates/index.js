const { generateUiElementAppJs } = require('./generate-appJs')
const { generateUiElementBootstrapJs } = require('./generate-bootstrapJs')
const { generateUiElementIndexJs } = require('./generate-indexJs')
const { generateUiElementPackageJson, generateUiElementPackageJsonWithoutLint } = require('./generate-packageJson')
const { generateUiElementsReadme } = require('./generate-readme')
const { generateUiElementJs } = require('./generate-uiElementJs')
const { generateUiElementWebpack } = require('./generate-webpackConfig')
const { generateUiElementIndexHtml } = require('./generateIndexHtml')
const { generateUiElementFederationExpose } = require('./generate-federation-exposeJs')
const { generateUiElementFederationShared } = require('./generate-federation-shared')
const { generateLayoutTemplateJs } = require('./generate-layout-template')
const { generateHeaderTemplateJs } = require('./generate-header-template')
const { generateSidebarTemplateJs } = require('./generate-sidebar-template')
const { generateUiElementEsLintRc } = require('./generate-eslintrc')
const { generateUiElementsCommitlintRc } = require('./generate-commitlintrc')
const { generateUiElementsPrettierRc } = require('./generate-prettierrc')
const { generateUiElementBabelRc } = require('./generate-babelrc')
const { generateUiElementAppTestJs } = require('./generate-appTest')
const { generateUiElementJestConfig } = require('./generate-JestConfig')
const { generateUiElementJestSetup } = require('./generate-JestSetup')

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
  generateUiElementEsLintRc,
  generateUiElementsCommitlintRc,
  generateUiElementsPrettierRc,
  generateUiElementFederationShared,
  generateUiElementBabelRc,
  generateUiElementAppTestJs,
  generateUiElementJestConfig,
  generateUiElementJestSetup,
}
