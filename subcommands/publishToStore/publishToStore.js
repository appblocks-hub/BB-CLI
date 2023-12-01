const chalk = require('chalk')
const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const PublishToStoreCore = require('./publishToStoreCore')
const HandleBeforePublishToStore = require('./plugins/handleBeforePublishToStore')

async function publishToStore(options) {
  const { logger } = new Logger('bb-publishToStore')
  try {
    const core = new PublishToStoreCore(options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforePublishToStore().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options?.configPath, core)

    /**
     * Start operations
     */
    await core.initializeConfigManager()
    await core.publishToStore()
  } catch (error) {
    logger.error(error)
    console.log(chalk.red(error.message))
  }
  spinnies.stopAll()
}

module.exports = publishToStore
