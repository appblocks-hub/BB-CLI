const chalk = require('chalk')
const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const SetPreviewEnvCore = require('./setPreviewEnvCore')
const HandleBeforeSetPreviewEnv = require('./plugins/handleBeforeSetPreviewEnv')

async function setPreviewEnv(options) {
  const { logger } = new Logger('bb-setPreviewEnv')
  try {
    const core = new SetPreviewEnvCore(options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeSetPreviewEnv().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)

    /**
     * Start operations
     */
    await core.initializeConfigManager()
    await core.setPreviewEnv()
  } catch (error) {
    logger.error(error)
    console.log(chalk.red(error.message))
    spinnies.add('bv', { text: `Error` })
    spinnies.add('bv', { text: error.message })
  }
  spinnies.stopAll()
}

module.exports = setPreviewEnv
