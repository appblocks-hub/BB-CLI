const chalk = require('chalk')
const { Logger } = require('../../utils/loggerV2')
const { spinnies } = require('../../loader')
const { feedback } = require('../../utils/cli-feedback')
const HandleBeforeStop = require('./plugins/handleBeforeStop')
const StopCore = require('./stopCore')
const HandleOutOfContext = require('./plugins/handleOutOfContext')
const KillTsWatcher = require('./plugins/killTsWatcher')

async function stop(blockName, options) {
  const { logger } = new Logger('start')
  try {
    const core = new StopCore(blockName, { ...options, logger, feedback, spinnies })
    new HandleOutOfContext().apply(core)
    new HandleBeforeStop().apply(core)
    new KillTsWatcher().apply(core)

    await core.initializeConfigManager()
    await core.stop()
  } catch (error) {
    console.log(chalk.red(error.message))
    logger.error(error)
  }
}

module.exports = stop
