const RegisterNewBlocksPlugin = require('./syncV2/plugins/registerNewBlocksStrategy')
const ReRegisterBlocksPlugin = require('./syncV2/plugins/reRegisterBlocksStrategy')

const SyncCore = require('./syncV2/syncCore')

async function Sync() {
  /*
   * @type {SyncCore}
   */
  const Core = new SyncCore()
  /**
   * Register all external plugins
   */
  /*
   *
   */
  /*
   *Apply all internal Plugins Here
   */
  new RegisterNewBlocksPlugin().apply(Core)
  new ReRegisterBlocksPlugin().apply(Core)

  /*
   * Start
   */

  await Core.setEnvironment()
  await Core.scanDirs()
  await Core.buildDepList()
}

module.exports = Sync
