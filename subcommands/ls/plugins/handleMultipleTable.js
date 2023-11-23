/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const chalk = require('chalk')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const { rowGenerate, getSyncStatus } = require('../utils')

class handleMultipleTable {
  /**
   *
   * @param {LsCore} core
   */
  apply(lsCore) {
    lsCore.hooks.beforeLs.tapPromise('handleMultipleTable', async (core) => {
      const { manager, cmdOpts, colorMap, head, colors, syncedBlockIds } = core

      if (!cmdOpts.multi) return

      const roots = []
      roots.push(manager)
      for (; roots.length > 0; ) {
        const root = roots.pop()
        const myColor = colorMap.get(root.config.blockId)
        /**
         * Set the header
         */
        core.lsTable.push(
          [
            {
              colSpan: head.length,
              content: `${myColor ? chalk.hex(myColor).bold(root.config.name) : root.config.name} (${getSyncStatus(
                syncedBlockIds,
                root
              )})`,
            },
          ],
          head.map((v) => chalk.cyanBright(v))
        )
        for await (const m of root.getDependencies()) {
          if (m instanceof PackageConfigManager) {
            /**
             * Refresh config to remove any references to non existent folders
             */
            await m.refreshConfig()
            roots.push(m)
            /**
             * Set a color for the package from the list
             */
            colorMap.set(m.config.blockId, colors[Math.floor(Math.random() * colors.length)])
          }
          core.lsTable.push(
            rowGenerate(
              m.isLive,
              {
                ...m.liveDetails,
                ...m.config,
                directory: m.directory,
              },
              getSyncStatus(syncedBlockIds, m),
              colorMap
            )
          )
        }
      }
    })
  }
}

module.exports = handleMultipleTable
