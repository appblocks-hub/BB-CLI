const chalk = require('chalk')
const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const LsCore = require('./lsCore')
const HandleBeforeLs = require('./plugins/handleBeforeLs')
const HandleSingleTable = require('./plugins/handleSingleTable')
const HandleMultipleTable = require('./plugins/handleMultipleTable')

async function ls(options) {
  const { logger } = new Logger('bb-ls')
  try {
    const core = new LsCore(options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeLs().apply(core)
    new HandleSingleTable().apply(core)
    new HandleMultipleTable().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)


    /**
     * Start operations
     */
    await core.initializeConfigManager()
    await core.ls()
  } catch (error) {
    logger.error(error)
    console.log(chalk.red(error.message))
  }
}

module.exports = ls
