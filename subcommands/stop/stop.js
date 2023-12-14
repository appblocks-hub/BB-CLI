const chalk = require('chalk')
const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { feedback } = require('../../utils/cli-feedback')
const HandleBeforeStop = require('./plugins/handleBeforeStop')
const StopCore = require('./stopCore')
const HandleOutOfContext = require('./plugins/handleOutOfContext')
const KillTsWatcher = require('./plugins/killTsWatcher')
const { handleBBConfigPlugin } = require('../../utils/plugins')

async function stop(blockName, options) {
  const { logger } = new Logger('start')
  try {
    const core = new StopCore(blockName, { ...options, logger, feedback, spinnies })
    new HandleOutOfContext().apply(core)
    new HandleBeforeStop().apply(core)
    new KillTsWatcher().apply(core)

    
    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)

    await core.initializeConfigManager()
    await core.stop()
  } catch (error) {
    console.log(chalk.red(error.message))
    logger.error(error)
  }
}

module.exports = stop
