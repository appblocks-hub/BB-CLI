/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

class HandleBeforeFlush {
  /**
   *
   * @param {FlushCore} core
   */
  apply(flushCore) {
    flushCore.hooks.beforeFlush.tapPromise('HandleBeforeFlush', async (core) => {
      const { manager, cmdArgs, cmdOpts } = core

      const [blockName, newBlockName] = cmdArgs || []
      if (blockName === newBlockName) {
        throw new Error(`No change in names`)
      }

      const { blockPath } = cmdOpts || {}
      if (!blockName && !blockPath) {
        throw new Error(`Please provide current block name`)
      }

      const { rootManager } = await manager.findMyParents()

      if (!rootManager) {
        throw new Error(`Error reading root manager`)
      }

    })
  }
}

module.exports = HandleBeforeFlush
