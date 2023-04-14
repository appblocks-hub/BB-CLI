/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const { writeFileSync } = require('fs')
const {
  generateIndex,
  generateGitIgnore,
  generateFunctionReadme,
  generatePackageJsonWithoutLint,
} = require('../../../templates/createTemplates/function-templates')
const { getJobConfig } = require('../../../utils/job')
// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handleJobBlock {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.beforeConfigUpdate.tapPromise(
      'handleJobBlock',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        const { type } = core.cmdOpts
        if (type !==  7) return

        const { blockName } = core.cmdArgs

        core.blockDetails.jobConfig = await getJobConfig()
        core.blockDetails.language = core.blockDetails.language || 'nodejs'
        core.blockDetails.start = core.blockDetails.start || 'node index.js'

        const indexString = generateIndex(blockName)
        const packageJsonString = generatePackageJsonWithoutLint(blockName)
        const gitIgnoreString = generateGitIgnore()
        const readmeString = generateFunctionReadme(blockName)
        // const packageJsonString = generatePackageJson(blockName)
        // const eslintrcString = generateFunctionEsLintRc()
        // const prettierrcString = generateFunctionPrettierRc()
        // const commitlintRcString = generateFunctionCommitlintRc()

        writeFileSync(`${core.blockFolderPath}/index.js`, indexString)
        writeFileSync(`${core.blockFolderPath}/package.json`, packageJsonString)
        writeFileSync(`${core.blockFolderPath}/README.md`, readmeString)
        writeFileSync(`${core.blockFolderPath}/.gitignore`, gitIgnoreString)
        // writeFileSync(`${core.blockFolderPath}/.eslintrc.json`, eslintrcString)
        // writeFileSync(`${core.blockFolderPath}/.prettierrc.json`, prettierrcString)
        // writeFileSync(`${core.blockFolderPath}/.commitlintrc.json`, commitlintRcString)
      }
    )
  }
}
module.exports = handleJobBlock
