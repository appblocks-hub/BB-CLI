/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const chalk = require('chalk')
const Table = require('cli-table3')
const { rowGenerate, getSyncStatus } = require('../utils')

class handleSingleTable {
  /**
   *
   * @param {LsCore} core
   */
  apply(lsCore) {
    lsCore.hooks.beforeLs.tapPromise('handleSingleTable', async (core) => {
      const { manager, cmdOpts, colorMap, head, syncedBlockIds } = core
      if (cmdOpts.multi) return

      core.lsTable = new Table({
        head: head.map((v) => chalk.cyanBright(v)),
      })

      const allMemberBlocks = await manager.getAllLevelMemberBlock()
      for (const blockManager of allMemberBlocks) {
        core.lsTable.push(
          rowGenerate(
            blockManager.isLive,
            {
              ...blockManager.liveDetails,
              ...blockManager.config,
              directory: blockManager.directory,
            },
            getSyncStatus(syncedBlockIds, blockManager),
            colorMap
          )
        )
      }
    })
  }
}

module.exports = handleSingleTable
