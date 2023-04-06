/* eslint-disable */
const { AppblockConfigManager } = require('../../../utils/appconfig-manager')
const { feedback } = require('../../../utils/cli-feedback')
const StartCore = require('../startCore')

class FilterBlocksToStart {
  // eslint-disable-next-line class-methods-use-this
  apply(startCore) {
    startCore.hooks.afterGroupingBlocks.tapPromise(
      'FilterBlocksToStart',
      async (
        /**
         * @type {StartCore}
         */
        core,
        /**
         * @type {AppblockConfigManager}
         */
        config
        // eslint-disable-next-line consistent-return
      ) => ({ core, config, blockGroups: core.blockGroups })
    )
  }
}
module.exports = FilterBlocksToStart
