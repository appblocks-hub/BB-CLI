const path = require('path')
// eslint-disable-next-line no-unused-vars
const StartCore = require('../stopCore')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const { readJsonAsync, treeKillSync } = require('../../../utils')

class KillTsWatcher {
  // eslint-disable-next-line class-methods-use-this
  apply(stopCore) {
    stopCore.hooks.afterStop.tapPromise(
      'killTsWatcher',
      async (
        /**
         * @type {StartCore}
         */
        core
      ) => {
        /**
         *  TODO:Kill the watcher process only if all fns will be stopped,
         *  if one fn is stoppping then don't kill the watcher
         */
        try {
          if (core.packageManager instanceof PackageConfigManager) {
            const fnEmPath = path.join(core.packageManager.directory, '._bb_', 'functions_emulator', '.emconfig.json')
            const {
              data: { watcherPid },
            } = await readJsonAsync(fnEmPath)
            treeKillSync(watcherPid)
          }
        } catch (err) {
          console.log('')
        }
      }
    )
  }
}
module.exports = KillTsWatcher
