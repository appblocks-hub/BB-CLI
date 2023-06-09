const { generateUiContainerAppJs } = require('./generate-appJs')
const { generateUiContainerBootstrapJs } = require('./generate-bootstrapJs')
const { generateUiContainerIndexHtml } = require('./generate-indexHtml')
const { generateUiContainerIndexJs } = require('./generate-indexJs')
const { generateUiContainerPackageJson, generateUiContainerPackageJsonWithoutLint } = require('./generate-packageJson')
const { generateUiContainerReadme } = require('./generate-readme')
const { generateUiContainerWebpack } = require('./generate-webpackConfig')
const { generateUiContainerLayout } = require('./generate-layout')
const { generateUiContainerAppRoute } = require('./generate-appRoute')
const { generateUiContainerCommitlintRc } = require('./generate-commitlintrc')
const { generateUiContainerEsLintRc } = require('./generate-eslintrc')
const { generateUiContainerPrettierRc } = require('./generate-prettierrc')
const { generateUiContainerBabelRc } = require('./generate-babelrc')
const { generateUiContainerAppTestJs } = require('./generate-appTest')
const { generateUiContainerJestConfig } = require('./generate-JestConfig')
const { generateUiContainerJestSetup } = require('./generate-JestSetup')

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
  generateUiContainerCommitlintRc,
  generateUiContainerEsLintRc,
  generateUiContainerPrettierRc,
  generateUiContainerPackageJsonWithoutLint,
  generateUiContainerBabelRc,
  generateUiContainerAppTestJs,
  generateUiContainerJestConfig,
  generateUiContainerJestSetup,
}
