const { appConfig } = require('../../utils/appconfigStore')
const CheckBlocksExists = require('./plugins/checkBlocksExists')
// const ContextCheck = require('./plugins/contextCheck')
const GetAllBlocksToKill = require('./plugins/getAllBlocksToKill')
const StopBlocks = require('./plugins/stopBlocks')
const StopCore = require('./stopCore')

async function stop(blockName, options) {
  //   const { global: isGlobal } = options
  await appConfig.init(null, null, null)
  const core = new StopCore(blockName, options, appConfig)
  new CheckBlocksExists().apply(core)
  new GetAllBlocksToKill().apply(core)
  // new ContextCheck().apply(core)
  new StopBlocks().apply(core)
  await core.stop()
}

module.exports = stop
