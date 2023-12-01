const chalk = require('chalk')
const { Logger } = require('../../utils/logger')
const { spinnies } = require('../../loader')
const { readBBConfigFile } = require('../../utils/plugins')
const ExecCore = require('./execCore')
const HandleBeforeExec = require('./plugins/handleBeforeExec')

async function exec(command, options) {
  const { logger } = new Logger('bb-exec')
  try {
    const core = new ExecCore(command, options, logger, spinnies)

    /**
     * Start registering plugins
     */
    new HandleBeforeExec().apply(core)

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
    await core.exec()
  } catch (error) {
    console.log(error)
    logger.error(error)
    console.log(chalk.red(error.message))
  }
}

module.exports = exec
