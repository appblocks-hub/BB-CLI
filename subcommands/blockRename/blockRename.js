const chalk = require('chalk')
const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { handleBBConfigPlugin } = require('../../utils/plugins')
const BlockRenameCore = require('./blockRenameCore')
const HandleBeforeBlockRename = require('./plugins/handleBeforeBlockRename')

async function blockRename(blockName, newBlockName, options) {
  const { logger } = new Logger('bb-blockRename')
  try {
    const core = new BlockRenameCore(blockName, newBlockName, options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeBlockRename().apply(core)

    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)


    /**
     * Start operations
     */
    await core.initializeConfigManager()
    await core.blockRename()
  } catch (error) {
    logger.error(error)
    console.log(chalk.red(error.message))
  }
}

module.exports = blockRename
