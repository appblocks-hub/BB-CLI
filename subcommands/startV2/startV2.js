/* eslint-disable */
const { Logger } = require('../../utils/loggerV2')
const StartCore = require('./startCore')
const { spinnies } = require('../../loader')
const { feedback } = require('../../utils/cli-feedback')

const HandleNodeFunctionStart = require('./plugins/handleNodeFunctionStart')
const HandleJSViewStart = require('./plugins/handleJSViewStart')
const LockAndAssignPorts = require('./plugins/lockAndAssignPortsPlugin.js')
const HandleOutOfContext = require('./plugins/handleOutOfContext')
const HandleBeforeStart = require('./plugins/handleBeforeStart')
const HandleBlockGrouping = require('./plugins/handleBlockGrouping')

async function start(blockName, options) {
  const { logger } = new Logger('start')

  const Start = new StartCore(blockName, {
    singleInstance: !options.multiInstance,
    ...options,
    logger,
    feedback,
    spinnies,
  })

  new HandleBeforeStart().apply(Start)
  new HandleOutOfContext().apply(Start)
  new HandleBlockGrouping().apply(Start)
  new LockAndAssignPorts().apply(Start)

  new HandleNodeFunctionStart().apply(Start)
  new HandleJSViewStart().apply(Start)

  try {
    await Start.initializeConfigManager()
    await Start.start()
    // await Start.cleanUp()
  } catch (error) {
    spinnies.add('start', { text: error.message })
    spinnies.fail('start', { text: error.message })
    spinnies.stopAll()
    console.log(error);
    logger.error(error)
    await Start.cleanUp()
  }
}

module.exports = start
