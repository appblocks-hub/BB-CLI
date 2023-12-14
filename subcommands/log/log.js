const chalk = require('chalk')
const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const LogCore = require('./logCore')
const HandleBeforeLog = require('./plugins/handleBeforeLog')

async function log(blockName, options) {
  const { logger } = new Logger('bb-log')
  try {
    const core = new LogCore(blockName, options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeLog().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)


    /**
     * Start operations
     */
    await core.initializeConfigManager()
    await core.log()
  } catch (error) {
    logger.error(error)
    console.log(chalk.red(error.message))
  }
}

module.exports = log
