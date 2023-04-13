/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const { writeFile } = require('fs/promises')
const { generateFunctionReadme } = require('../../../templates/createTemplates/function-templates')
// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handlePackageBlock {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.afterCreate.tapPromise(
      'handlePackageBlock',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        const { type } = core.cmdOpts
        if (type !==  1) return

        const { blockName } = core.cmdArgs

        delete core.blockDetails.language

        const readmeString = generateFunctionReadme(blockName)
        writeFile(`${core.blockFolderPath}/README.md`, readmeString)
      }
    )
  }
}
module.exports = handlePackageBlock
