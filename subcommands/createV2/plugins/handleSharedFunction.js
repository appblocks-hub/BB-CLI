/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const { writeFileSync } = require('fs')
const {
  generateGitIgnore,
  generateSharedFunctionIndex,
  generateSharedFunctionPackageJson,
  generateSharedFunctionReadme,
} = require('../../../templates/createTemplates/shared-templates')
// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handleSharedFunction {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.afterCreate.tapPromise(
      'handleSharedFunction',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        const { type } = core.cmdOpts
        if (type !== 6) return

        const { blockName } = core.cmdArgs

        core.blockDetails.language = core.blockDetails.language || 'nodejs'
        core.blockDetails.start = core.blockDetails.start || 'node index.js'

        const indexString = generateSharedFunctionIndex(blockName)
        const packageJsonString = generateSharedFunctionPackageJson(blockName)
        const readmeString = generateSharedFunctionReadme(blockName)
        const gitIgnoreString = generateGitIgnore()
        // const prettierrcString = generateSharedFunctionPrettierRc()
        // const commitlintRcString = generateSharedFunctionCommitlintRc()
        // const eslintrcString = generateSharedFunctionEsLintRc()

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
module.exports = handleSharedFunction
