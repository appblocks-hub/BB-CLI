/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handleMultiRepo {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.beforeConfigUpdate.tapPromise(
      'handleMultiRepo',
      async (
        /**
         * @type {CreateCore}
         */
        // core
      ) => {
        // if (core.repoType !== 'multi') return

        // const { type, createFromExistingURL } = core.cmdOpts
        // const { blockName } = core.cmdArgs

        // const { blockSource, blockFinalName } = await createBlockV2({
        //   cwd: core.cwd,
        //   blockTypeNo: type,
        //   blockName,
        //   createFromExistingURL,
        // })

        // if (blockName !== blockFinalName) {
        //   core.cmdArgs.blockName = blockFinalName
        //   const newFolderPath = path.join(core.cwd, blockFinalName)
        //   await renameSync(core.blockFolderPath, newFolderPath)
        //   core.blockFolderPath = newFolderPath
        //   core.blockConfigPath = path.join(core.blockFolderPath, 'block.config.json')
        // }

        // core.blockDetails = {
        //   ...core.blockDetails,
        //   name: blockFinalName,
        //   source: blockSource,
        // }
      }
    )
  }
}
module.exports = handleMultiRepo
