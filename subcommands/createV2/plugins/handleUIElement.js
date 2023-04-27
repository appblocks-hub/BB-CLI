/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const { writeFileSync, mkdirSync } = require('fs')
const { generateGitIgnore } = require('../../../templates/createTemplates/function-templates')
const {
  generateUiElementJs,
  generateUiElementAppJs,
  generateUiElementWebpack,
  generateUiElementIndexJs,
  generateUiElementsReadme,
  generateUiElementIndexHtml,
  generateUiElementsEsLintRc,
  generateUiElementBootstrapJs,
  generateUiElementPackageJson,
  generateUiElementsPrettierRc,
  generateUiElementsCommitlintRc,
  generateUiElementFederationExpose,
} = require('../../../templates/createTemplates/uiElement-templates')

// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handleUIElement {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.beforeConfigUpdate.tapPromise(
      'handleUIElement',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        const { type } = core.cmdOpts
        if (type !== 3) return

        const { blockName } = core.cmdArgs

        core.blockDetails.language = core.blockDetails.language || 'js'
        core.blockDetails.start = core.blockDetails.start || 'npx webpack-dev-server'
        core.blockDetails.build = core.blockDetails.build || 'npx webpack'

        const indexHtmlString = generateUiElementIndexHtml(blockName)
        const webpackConfigString = generateUiElementWebpack(blockName)
        const indexJsString = generateUiElementIndexJs(blockName)
        const bootstrapString = generateUiElementBootstrapJs(blockName)
        const appJsString = generateUiElementAppJs(blockName)
        const uiElementString = generateUiElementJs(blockName)
        const gitignore = generateGitIgnore()
        const readmeString = generateUiElementsReadme(blockName)
        const fedExposeString = generateUiElementFederationExpose(blockName)
        const packageJsonString = generateUiElementPackageJson(blockName)
        const eslintrcString = generateUiElementsEsLintRc()
        const commitLintRcString = generateUiElementsCommitlintRc()
        const prettierrcString = generateUiElementsPrettierRc()

        mkdirSync(`${core.blockFolderPath}/public`)
        mkdirSync(`${core.blockFolderPath}/src/remote`, { recursive: true })

        writeFileSync(`${core.blockFolderPath}/public/index.html`, indexHtmlString)

        writeFileSync(`${core.blockFolderPath}/src/index.js`, indexJsString)
        writeFileSync(`${core.blockFolderPath}/src/bootstrap.js`, bootstrapString)
        writeFileSync(`${core.blockFolderPath}/src/App.js`, appJsString)
        writeFileSync(`${core.blockFolderPath}/src/remote/${blockName}.js`, uiElementString)

        writeFileSync(`${core.blockFolderPath}/package.json`, packageJsonString)
        writeFileSync(`${core.blockFolderPath}/README.md`, readmeString)
        writeFileSync(`${core.blockFolderPath}/webpack.config.js`, webpackConfigString)
        writeFileSync(`${core.blockFolderPath}/federation-expose.js`, fedExposeString)
        writeFileSync(`${core.blockFolderPath}/.gitignore`, gitignore)
        writeFileSync(`${core.blockFolderPath}/.eslintrc.json`, eslintrcString)
        writeFileSync(`${core.blockFolderPath}/.prettierrc.json`, prettierrcString)
        writeFileSync(`${core.blockFolderPath}/.commitlintrc.json`, commitLintRcString)
      }
    )
  }
}
module.exports = handleUIElement
