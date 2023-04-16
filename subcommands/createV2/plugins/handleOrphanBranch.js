/* eslint-disable class-methods-use-this */

// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handleOrphanBranch {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.afterCreate.tapPromise(
      'handleOrphanBranch',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        if (core.repoType !== 'mono') return
        // const { spinnies, logger, blockFolderPath } = core
      }
    )
  }
}
module.exports = handleOrphanBranch
