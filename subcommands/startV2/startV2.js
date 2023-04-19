/* eslint-disable */
const { Logger } = require('../../utils/loggerV2')
const XYZ = require('./plugins/afterEnvPlugin')
const FilterBlocksToStart = require('./plugins/afterGroupingPlugin')
const BuildFnEmulator = require('./plugins/fnEmulatorPlugins')
const ViewSingleBuild = require('./plugins/viewEmulatorPlugins')
const { LockAndAssignPorts } = require('./plugins/LockAndAssignPortsPlugin')
const StartCore = require('./startCore')

async function start(blockName, { usePnpm, multiInstance }) {
  const { logger } = new Logger('start')
  const Start = new StartCore(blockName, { usePnpm, multiInstance, singleInstance: !multiInstance })
  new XYZ().apply(Start)
  new FilterBlocksToStart().apply(Start)
  new LockAndAssignPorts().apply(Start)

  new BuildFnEmulator().apply(Start)
  new ViewSingleBuild().apply(Start)

  logger.info('Plugins applied')
  const { _, err } = await Start.setEnvironment()
  logger.info('env set')
  if (err) {
    logger.error('error in setting up environment' + err)
    process.exitCode = 1
    return
  }

  try {
    await Start.groupBlocks()
    await Start.buildEmulators()
    await Start.singleBuildForView()

    await Start.cleanUp()
  } catch (error) {
    console.log(error)
    await Start.cleanUp()
  }
}

module.exports = start
