const chalk = require('chalk')
const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const ConfigCore = require('./configCore')
const HandleSet = require('./plugins/handleSet')
const HandleDelete = require('./plugins/handleDelete')

async function config(options) {
  const { logger } = new Logger('bb-config')
  try {
    const core = new ConfigCore(options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleDelete().apply(core)
    new HandleSet().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)


    /**
     * Start operations
     */
    await core.config()
  } catch (error) {
    logger.error(error)
    console.log(chalk.red(error.message))
  }
}

module.exports = config
