class GetAllBlocksToKill {
  // eslint-disable-next-line class-methods-use-this
  apply(syncer) {
    syncer.hooks.beforeStopBlocks.tapPromise('GetAllBlocksToKill', async (core) => {
      if (core.stopAllBlocks)
        for (const {
          meta: { name: blockname },
        } of core.appConfig.liveBlocks) {
          // eslint-disable-next-line no-param-reassign
          core.blocksToKill = [...core.blocksToKill, blockname]
        }
    })
  }
}

module.exports = GetAllBlocksToKill
