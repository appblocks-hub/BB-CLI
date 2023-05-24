/* eslint-disable no-param-reassign */
// eslint-disable-next-line no-unused-vars
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
// eslint-disable-next-line no-unused-vars
const StartCore = require('../startCore')

class HandleEnvironments {
  // eslint-disable-next-line class-methods-use-this
  apply(startCore) {
    startCore.hooks.beforeStart.tapPromise(
      'HandleEnvironments',
      async (
        /**
         * @type {StartCore}
         */
        core
        // /**
        //  * @type {PackageConfigManager}
        //  */
        // packageConfigManager
      ) => {
        core.HandleEnvironments="HandleEnvironments"
      }
    )
  }
}
module.exports = HandleEnvironments
