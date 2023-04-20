const treeKill = require('tree-kill')

class StopBlocks {
  // eslint-disable-next-line class-methods-use-this
  apply(syncer) {
    syncer.hooks.stopBlocks.tapPromise('StopBlocks', async (core) => {
      // eslint-disable-next-line no-unused-expressions
      !core?.blocksToKill?.length && console.log('No Blocks to Stop')
      // eslint-disable-next-line array-callback-return
      core?.blocksToKill?.map((block) => {
        stopBlock(block, core.appConfig)
      })
    })
  }
}

function stopBlock(name, appConfig) {
  const liveDetails = appConfig.getLiveDetailsof(name)
  if (liveDetails.isJobOn) {
    console.log('\nLive Job found for this block! Please stop job and try again\n')
    process.exit(1)
  }
  treeKill(liveDetails.pid, (err) => {
    if (err) {
      console.log('Error in stopping block process with pid ', liveDetails.pid)
      console.log(err)
      return
    }
    // eslint-disable-next-line no-param-reassign
    appConfig.stopBlock = name
    console.log(`${name} stopped successfully!`)
  })
}

module.exports = StopBlocks
