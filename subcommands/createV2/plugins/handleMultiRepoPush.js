/* eslint-disable class-methods-use-this */

// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handleMultiRepoPush {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.afterCreate.tapPromise(
      'handleMultiRepoPush',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        if (core.repoType !== 'multi') return
        // const { spinnies, logger, blockFolderPath } = core
      }
    )
  }
}
module.exports = handleMultiRepoPush
