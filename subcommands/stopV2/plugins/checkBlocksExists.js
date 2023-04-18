class CheckBlocksExists {
  // eslint-disable-next-line class-methods-use-this
  apply(syncer) {
    let blocksToStop = []
    let nonLiveBlocks = []
    syncer.hooks.beforeStopBlocks.tapPromise('CheckBlocksExists', async (core) => {
      for (const {
        meta: { name: blockname },
      } of core.appConfig.nonLiveBlocks) {
        nonLiveBlocks = [...nonLiveBlocks, blockname]
      }
      for (const {
        meta: { name: blockname },
      } of core.appConfig.liveBlocks) {
        blocksToStop = core.cmdArgs.includes(blockname) ? [...blocksToStop, blockname] : blocksToStop
      }
      core.cmdArgs?.map((i) =>
        // eslint-disable-next-line no-nested-ternary
        !blocksToStop?.includes(i)
          ? nonLiveBlocks?.includes(i)
            ? console.log(i, 'block is not live')
            : console.log(i, 'block is not available')
          : null
      )
      // eslint-disable-next-line no-param-reassign
      core.blocksToKill = blocksToStop
    })
  }
}

module.exports = CheckBlocksExists
