const chalk = require('chalk')
const { headLessConfigStore } = require('../../configstore')
const { Logger } = require('../../utils/logger')
const { handleBBConfigPlugin, handleCmdOptionPlugin } = require('../../utils/plugins')
const InitCore = require('./initCore')
const HandleBeforeInit = require('./plugins/handleBeforeInit')
const HandleJSTemplate = require('./plugins/handleJsTemplate')
const HandleTSTemplate = require('./plugins/handleTsTemplate')

async function init(blocksName, options) {
  const { logger } = new Logger('bb-init')
  try {
    const core = new InitCore(blocksName, options, logger)

    if (process.env.BB_CLI_RUN_HEADLESS) {
      global.HEADLESS_CONFIGS = headLessConfigStore().store
    }

    /**
     * Start registering plugins
     */
    new HandleBeforeInit().apply(core)
    new HandleJSTemplate().apply(core)
    new HandleTSTemplate().apply(core)


    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)


    if (options.plugin) {
      await handleCmdOptionPlugin(options, core)
    }

    /**
     * Start operations
     */
    await core.initializeConfigManager()
    await core.init()
  } catch (error) {
    logger.error(error)
    console.log(chalk.red(error.message))
  }
}

module.exports = init
