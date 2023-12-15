const chalk = require('chalk')
const { Logger } = require('../../utils/logger')
const StartCore = require('./startCore')
const { spinnies } = require('../../loader')
const { feedback } = require('../../utils/cli-feedback')
const { handleBBConfigPlugin } = require('../../utils/plugins')

const HandleNodeFunctionStart = require('./plugins/handleNodeFunctionStart')
const HandleJSViewStart = require('./plugins/handleJSViewStart')
const HandleOutOfContext = require('./plugins/handleOutOfContext')
const HandleBeforeStart = require('./plugins/handleBeforeStart')
const HandleBlockGrouping = require('./plugins/handleBlockGrouping')
const HandleAfterStart = require('./plugins/handleAfterStart')
const LockAndAssignPorts = require('./plugins/lockAndAssignPortsPlugin.js')

async function start(blockName, options) {
  const { logger } = new Logger('start')
  const core = new StartCore(blockName, {
    singleInstance: !options.multiInstance,
    ...options,
    logger,
    feedback,
    spinnies,
  })

  try {
    new HandleOutOfContext().apply(core)
    new HandleBeforeStart().apply(core)
    new HandleBlockGrouping().apply(core)
    new LockAndAssignPorts().apply(core)

    new HandleNodeFunctionStart().apply(core)
    new HandleJSViewStart().apply(core)

    new HandleAfterStart().apply(core)
    /**
     * Read and register plugins from bb config
     */
    await handleBBConfigPlugin(options.configPath, core)

    await core.initializeConfigManager()
    await core.start()
    if (options.environment === 'preview') console.log(`\nStart process completed`)
  } catch (error) {
    logger.error(error)
    spinnies.add('start', { text: error.message })
    spinnies.fail('start', { text: chalk.red(error.message) })
  }
  await core.cleanUp()
  spinnies.stopAll()
}

module.exports = start
