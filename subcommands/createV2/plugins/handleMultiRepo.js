/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const createBlockV2 = require('../../../utils/createBlockV2')
// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handleMultiRepo {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.afterCreate.tapPromise(
      'handleMultiRepo',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        console.log('handleMultiRepo')

        if (core.repoType !== 'multi') return

        const { type, createFromExistingURL } = core.cmdOpts
        const { blockName } = core.cmdArgs

        const { blockSource, blockFinalName } = await createBlockV2({
          cwd: core.cwd,
          blockTypeNo: type,
          blockName,
          createFromExistingURL,
        })

        core.blockDetails = {
          ...core.blockDetails,
          name: blockFinalName,
          source: blockSource,
        }
      }
    )
  }
}
module.exports = handleMultiRepo
