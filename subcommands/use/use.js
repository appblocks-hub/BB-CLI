const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const UseCore = require('./useCore')
const HandleBeforeUse = require('./plugins/handleBeforeUse')

async function use(spaceName, options) {
  const { logger } = new Logger('bb-use')
  try {
    const core = new UseCore(spaceName, options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeUse().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)

    /**
     * Start operations
     */
    await core.initializeConfigManager()
    await core.use()
  } catch (error) {
    logger.error(error)
    spinnies.add('use', { text: `Error` })
    spinnies.add('use', { text: error.message })
  }
  spinnies.stopAll()
}

module.exports = use
