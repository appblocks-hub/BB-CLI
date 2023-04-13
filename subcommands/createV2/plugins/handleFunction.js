/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const { writeFileSync } = require('fs')
const {
  generateIndex,
  generatePackageJson,
  generateGitIgnore,
  generateFunctionReadme,
} = require('../../../templates/createTemplates/function-templates')

// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handleFunction {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.afterCreate.tapPromise(
      'handleFunction',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        const { type } = core.cmdOpts
        if (type !== 4) return

        const { blockName } = core.cmdArgs

        core.blockDetails.language = core.blockDetails.language || 'nodejs'
        core.blockDetails.start = core.blockDetails.start || 'node index.js'

        const indexString = generateIndex(blockName)
        const packageJsonString = generatePackageJson(blockName)
        const gitIgnoreString = generateGitIgnore()
        const readmeString = generateFunctionReadme(blockName)
        // const eslintrcString = generateFunctionEsLintRc()
        // const prettierrcString = generateFunctionPrettierRc()
        // const commitlintRcString = generateFunctionCommitlintRc()

        writeFileSync(`${core.blockFolderPath}/index.js`, indexString)
        writeFileSync(`${core.blockFolderPath}/package.json`, packageJsonString)
        writeFileSync(`${core.blockFolderPath}/.gitignore`, gitIgnoreString)
        writeFileSync(`${core.blockFolderPath}/README.md`, readmeString)
        // writeFileSync(`${core.blockFolderPath}/.eslintrc.json`, eslintrcString)
        // writeFileSync(`${core.blockFolderPath}/.prettierrc.json`, prettierrcString)
        // writeFileSync(`${core.blockFolderPath}/.commitlintrc.json`, commitlintRcString)
      }
    )
  }
}
module.exports = handleFunction
