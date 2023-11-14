const { headLessConfigStore } = require('../../configstore')
const { Logger } = require('../../utils/logger')
const InitCore = require('./initCore')
const IdentifyUniqueBlockName = require('./plugins/identifyUniqueBlockNamePlugin')
const SetAppBlockVersionPlugin = require('./plugins/setAppBlockVersionPlugin')

async function init(blocksName, options) {
  const { logger } = new Logger('bb-init')
  const core = new InitCore(blocksName, options, logger)

  if (process.env.BB_CLI_RUN_HEADLESS) {
    global.HEADLESS_CONFIGS = headLessConfigStore().store
  }
  /**
   * Start registering plugins
   */
  new IdentifyUniqueBlockName().apply(core)
  new SetAppBlockVersionPlugin().apply(core)
  /**
   * Start operations
   */
  await core.createPackage()
}

module.exports = init
