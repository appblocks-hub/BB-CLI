/* eslint-disable */
const { Logger } = require('../../utils/loggerV2')
const XYZ = require('./plugins/afterEnvPlugin')
const FilterBlocksToStart = require('./plugins/afterGroupingPlugin')
const BuildFnEmulator = require('./plugins/fnEmulatorPlugins')
const { LockAndAssignPorts } = require('./plugins/LockAndAssignPortsPlugin')
const StartCore = require('./startCore')

async function start(blockname, { usePnpm }) {
  const { logger } = new Logger('start')
  const Start = new StartCore(blockname, { usePnpm })
  new XYZ().apply(Start)
  new FilterBlocksToStart().apply(Start)
  new LockAndAssignPorts().apply(Start)

  new BuildFnEmulator().apply(Start)

  logger.info('Plugins applied')
  const { _, err } = await Start.setEnvironment()
  logger.info('env set')
  if (err) {
    logger.error('error in setting up environment' + err)
    process.exitCode = 1
    return
  }
  await Start.groupBlocks()
  await Start.buildEmulators()

  await Start.cleanUp()
}

module.exports = start
