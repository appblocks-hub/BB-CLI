/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const { mkdirSync, writeFileSync } = require('fs')
const { generateGitIgnore } = require('../../../templates/createTemplates/function-templates')
const {
  generateUiContainerIndexHtml,
  generateUiContainerWebpack,
  generateUiContainerIndexJs,
  generateUiContainerBootstrapJs,
  generateUiContainerAppJs,
  generateUiContainerReadme,
  generateUiContainerAppRoute,
  generateUiContainerLayout,
  generateUiContainerPackageJson,
  generateUiContainerEsLintRc,
  generateUiContainerPrettierRc,
  generateUiContainerCommitlintRc,
} = require('../../../templates/createTemplates/uiContainer-templates')

// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handleUIContainer {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.beforeConfigUpdate.tapPromise(
      'handleUIContainer',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        const { type } = core.cmdOpts
        if (type !== 2) return

        const { blockName } = core.cmdArgs

        core.blockDetails.language = core.blockDetails.language || 'js'
        core.blockDetails.start = core.blockDetails.start || 'npx webpack-dev-server'
        core.blockDetails.build = core.blockDetails.build || 'npx webpack'

        const indexHtmlString = generateUiContainerIndexHtml(blockName)
        const webpackConfigString = generateUiContainerWebpack(blockName)
        const indexJsString = generateUiContainerIndexJs(blockName)
        const bootstrapString = generateUiContainerBootstrapJs(blockName)
        const appJsString = generateUiContainerAppJs(blockName)
        const gitignore = generateGitIgnore()
        const readmeString = generateUiContainerReadme(blockName)
        const appRouteString = generateUiContainerAppRoute(blockName)
        const layoutString = generateUiContainerLayout(blockName)
        const packageJsonString = generateUiContainerPackageJson(blockName)
        const eslintrcString = generateUiContainerEsLintRc()
        const prettierrcString = generateUiContainerPrettierRc()
        const commitlintRcString = generateUiContainerCommitlintRc()

        mkdirSync(`${core.blockFolderPath}/public`, { recursive: true })
        mkdirSync(`${core.blockFolderPath}/common/routes`, { recursive: true })
        mkdirSync(`${core.blockFolderPath}/components/Layout`, { recursive: true })
        mkdirSync(`${core.blockFolderPath}/src`, { recursive: true })

        writeFileSync(`${core.blockFolderPath}/public/index.html`, indexHtmlString)

        writeFileSync(`${core.blockFolderPath}/src/index.js`, indexJsString)
        writeFileSync(`${core.blockFolderPath}/src/bootstrap.js`, bootstrapString)
        writeFileSync(`${core.blockFolderPath}/src/App.js`, appJsString)

        writeFileSync(`${core.blockFolderPath}/common/routes/appRoute.js`, appRouteString)
        writeFileSync(`${core.blockFolderPath}/components/Layout/index.js`, layoutString)

        writeFileSync(`${core.blockFolderPath}/package.json`, packageJsonString)
        writeFileSync(`${core.blockFolderPath}/README.md`, readmeString)
        writeFileSync(`${core.blockFolderPath}/webpack.config.js`, webpackConfigString)
        writeFileSync(`${core.blockFolderPath}/.gitignore`, gitignore)
        writeFileSync(`${core.blockFolderPath}/.eslintrc.json`, eslintrcString)
        writeFileSync(`${core.blockFolderPath}/.prettierrc.json`, prettierrcString)
        writeFileSync(`${core.blockFolderPath}/.commitlintrc.json`, commitlintRcString)
      }
    )
  }
}
module.exports = handleUIContainer
