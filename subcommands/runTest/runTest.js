const { headLessConfigStore } = require('../../configstore')
const { Logger } = require('../../utils/logger')
const RunTestCore = require('./runTestCore')
const HandleBeforeRunTest = require('./plugins/handleBeforeRunTest')
const { readBBConfigFile } = require('../../utils/plugins')

async function runTest(options) {
  const { logger } = new Logger('bb-runTest')
  const core = new RunTestCore(options, logger)

  if (process.env.BB_CLI_RUN_HEADLESS) {
    global.HEADLESS_CONFIGS = headLessConfigStore().store
  }

  /**
   * Start registering plugins
   */
  new HandleBeforeRunTest().apply(core)

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
  await core.runTest()
}

module.exports = runTest
