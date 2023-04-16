const chalk = require('chalk')
const { readFile } = require('fs/promises')
const path = require('path')
const { offerAndCreateBlock } = require('../../../utils/sync-utils')
// eslint-disable-next-line no-unused-vars
const SyncCore = require('../syncCore')

class ReRegisterBlocksPlugin {
  constructor() {
    this.sourceFullBlocks = []
    this.map = {}
  }

  apply(syncer) {
    syncer.hooks.afterWalk.tapPromise('reRegisterBlocksStrategy', async (/** @type {SyncCore} */ core) => {
      for (let i = 0; i < core.blockDirectoriesFound.length; i += 1) {
        const configPath = path.join(core.blockDirectoriesFound[i], core.packageConfigFileName)
        try {
          const configObject = await readFile(configPath, { encoding: 'utf8' }).then((_d) => JSON.parse(_d))
          if (configObject.source?.ssh) {
            this.sourceFullBlocks.push(core.blockDirectoriesFound[i])

            this.map[configObject.name] = core.blockDirectoriesFound[i]
            /**
             * Remove the current entry from core, later we can add it back, if it is not used
             */
            core.blockDirectoriesFound.splice(i, 1)
            i -= 1
          }
        } catch (err) {
          /**
           * Could push it to core.discardedBlocks
           */
          console.log('Error:', err)
        }
      }

      if (!this.sourceFullBlocks.length) return

      /**
       * If there are blocks that could be re-registered
       */
      console.log(`\nFollowing blocks could be re-registered`)
      console.log('------------------------------')
      let i = 0
      for (const block in this.map) {
        if (Object.hasOwnProperty.call(this.map, block)) {
          console.log(`${i + 1}:${chalk.whiteBright(block)} (${chalk.dim(this.map[block])})`)
          i += 1
        }
      }
      console.log('------------------------------')
      const result = await offerAndCreateBlock(this.sourceFullBlocks)
      result
        .filter((b) => !b.registered)
        .forEach((v) => {
          core.blockDirectoriesFound.push(v.oldPath)
        })
      core.newDependencies.push(...result.filter((b) => b.registered))
    })
  }
}

module.exports = ReRegisterBlocksPlugin
