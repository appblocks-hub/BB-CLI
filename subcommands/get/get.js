const chalk = require('chalk')
const { headLessConfigStore } = require('../../configstore')
const { Logger } = require('../../utils/logger')
const GetCore = require('./getCore')
const HandleAfterGet = require('./plugins/handleAfterGet')
const HandleBeforeGet = require('./plugins/handleBeforeGet')
const { readBBConfigFile } = require('../../utils/plugins')
const { spinnies } = require('../../loader')

async function get(component, options) {
  const { logger } = new Logger('bb-get')
  const core = new GetCore(component, options, logger, spinnies)

  try {
    if (process.env.BB_CLI_RUN_HEADLESS) {
      global.HEADLESS_CONFIGS = headLessConfigStore().store
    }

    /**
     * Read and register plugins from bb config
     */
    const bbConfig = await readBBConfigFile(options.configPath)
    if (bbConfig.plugins) {
      bbConfig.plugins.forEach((plugin) => plugin.apply(core))
    }

    /**
     * Start registering plugins
     */
    new HandleBeforeGet().apply(core)
    new HandleAfterGet().apply(core)

    /**
     * Start operations
     */
    await core.initializeConfigManager()
    await core.get()
  } catch (error) {
    logger.error(error)
    console.log(error)
    console.log(chalk.red(error.message || error))
  }
  spinnies.stopAll()
}

module.exports = get
