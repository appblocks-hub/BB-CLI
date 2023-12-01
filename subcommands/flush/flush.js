const chalk = require('chalk')
const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { readBBConfigFile } = require('../../utils/plugins')
const FlushCore = require('./flushCore')
const HandleBeforeFlush = require('./plugins/handleBeforeFlush')

async function flush(options) {
  const { logger } = new Logger('bb-flush')
  try {
    const core = new FlushCore(options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeFlush().apply(core)

    /**
     * Read and register plugins from bb config
     */
    const bbConfig = await readBBConfigFile(options.configPath)
    if (bbConfig.plugins) {
      bbConfig.plugins.forEach((plugin) => plugin.apply(core))
    }

    /**
     * Start operations
     */
    await core.initializeConfigManager()
    await core.flush()
  } catch (error) {
    logger.error(error)
    console.log(chalk.red(error.message))
  }
}

module.exports = flush
