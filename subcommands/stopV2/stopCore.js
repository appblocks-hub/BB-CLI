const { AsyncSeriesHook } = require('tapable')

class StopCore {
  /**
   * @type {}
   */

  constructor(blocksToKill, options, appConfig) {
    this.cmdArgs = blocksToKill
    this.cmdOpts = options
    this.appConfig = appConfig
    this.blocksToKill = []
    this.stopAllBlocks = !blocksToKill.length
    this.hooks = {
      beforeStopBlocks: new AsyncSeriesHook(['core']),
      stopBlocks: new AsyncSeriesHook(['core']),
      afterStopBlocks: new AsyncSeriesHook(['core']),
    }
  }

  async stop() {
    await this.hooks.beforeStopBlocks.promise(this)
    await this.hooks.stopBlocks.promise(this)
    // console.log(this.blocksToKill)
    // this.blocksToKill?.map((block) => console.log(block))
  }
}

module.exports = StopCore
