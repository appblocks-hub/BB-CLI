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
  // generateUiContainerPackageJsonWithoutLint,
  generateUiContainerReadme,
  generateUiContainerAppRoute,
  generateUiContainerLayout,
  generateUiContainerPackageJson,
  generateUiContainerCommitlintRc,
  generateUiContainerEsLintRc,
  generateUiContainerPrettierRc,

  generateUiContainerBabelRc,
  generateUiContainerAppTestJs,
  generateUiContainerJestConfig,
  generateUiContainerJestSetup,
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
        // const packageJsonString = generateUiContainerPackageJsonWithoutLint(blockName)
        const gitignore = generateGitIgnore()
        const readmeString = generateUiContainerReadme(blockName)
        const appRouteString = generateUiContainerAppRoute(blockName)
        const layoutString = generateUiContainerLayout(blockName)
        const packageJsonString = generateUiContainerPackageJson(blockName)
        const eslintrcString = generateUiContainerEsLintRc()
        const prettierrcString = generateUiContainerPrettierRc()
        const commitlintRcString = generateUiContainerCommitlintRc()

        const babelRcString = generateUiContainerBabelRc()
        const jestConfigString = generateUiContainerJestConfig()
        const jestSetupString = generateUiContainerJestSetup()
        const appTestString = generateUiContainerAppTestJs()

        mkdirSync(`${core.blockFolderPath}/public`, { recursive: true })
        mkdirSync(`${core.blockFolderPath}/src/remote`, { recursive: true })
        mkdirSync(`${core.blockFolderPath}/src/remote/common/routes`, { recursive: true })
        mkdirSync(`${core.blockFolderPath}/src/remote/components/Layout`, { recursive: true })

        writeFileSync(`${core.blockFolderPath}/public/index.html`, indexHtmlString)

        writeFileSync(`${core.blockFolderPath}/src/index.js`, indexJsString)
        writeFileSync(`${core.blockFolderPath}/src/bootstrap.js`, bootstrapString)
        writeFileSync(`${core.blockFolderPath}/src/App.js`, appJsString)

        writeFileSync(`${core.blockFolderPath}/src/remote/common/routes/appRoute.js`, appRouteString)
        writeFileSync(`${core.blockFolderPath}/src/remote/components/Layout/index.js`, layoutString)

        writeFileSync(`${core.blockFolderPath}/package.json`, packageJsonString)
        writeFileSync(`${core.blockFolderPath}/README.md`, readmeString)
        writeFileSync(`${core.blockFolderPath}/webpack.config.js`, webpackConfigString)
        writeFileSync(`${core.blockFolderPath}/.gitignore`, gitignore)
        writeFileSync(`${core.blockFolderPath}/.eslintrc.json`, eslintrcString)
        writeFileSync(`${core.blockFolderPath}/.prettierrc.json`, prettierrcString)
        writeFileSync(`${core.blockFolderPath}/.commitlintrc.json`, commitlintRcString)

        writeFileSync(`${core.blockFolderPath}/.babelrc`, babelRcString)
        writeFileSync(`${core.blockFolderPath}/jest.config.js`, jestConfigString)
        writeFileSync(`${core.blockFolderPath}/jest.setup.js`, jestSetupString)
        writeFileSync(`${core.blockFolderPath}/App.test.js`, appTestString)
      }
    )
  }
}
module.exports = handleUIContainer
