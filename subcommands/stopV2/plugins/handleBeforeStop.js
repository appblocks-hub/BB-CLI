/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const chalk = require('chalk')
// eslint-disable-next-line no-unused-vars
const StopCore = require('../stopCore')

class HandleBeforeStop {
  /**
   *
   * @param {StopCore} stopCore
   */
  apply(stopCore) {
    stopCore.hooks.beforeStop.tapPromise('HandleBeforeStop', async (core) => {
      const liveBlocks = await core.packageManager.liveBlocks()

      if (liveBlocks.length <= 0) throw new Error(`No live blocks to stop!`)

      const [blockName] = core.cmdArgs
      if (blockName && core.cmdArgs?.length === 1) {
        if (!core.packageManager.has(blockName)) {
          throw new Error(`Block ${blockName} not found in package ${core.packageConfig.name}`)
        }
        const blockManager = await core.packageManager.getBlock(blockName)
        core.blocksToStop = [blockManager]
        if (!blockManager.liveDetails.singleInstance) throw new Error(`Block is started as single instance, Run bb stop`)
        if (!blockManager.liveDetails.isOn) throw new Error(`Block ${blockName} not live`)
        return
      }

      const stopBlockNames = core.cmdArgs
      const notFoundBlocks = stopBlockNames

      for (const blockManager of liveBlocks) {
        if (stopBlockNames?.length) {
          if (!stopBlockNames.includes(blockManager.config.name)) continue
          const index = notFoundBlocks.indexOf(blockManager.config.name)
          if (index > -1) notFoundBlocks.splice(index, 1)
        }
        core.blocksToStop.push(blockManager)
      }

      if (notFoundBlocks.length) {
        console.log(chalk.yellow(`Following blocks are not found ${notFoundBlocks} to stop`))
      }

      if (!core.blocksToStop) {
        throw new Error(`No blocks to stop`)
      }
    })
  }
}

module.exports = HandleBeforeStop
