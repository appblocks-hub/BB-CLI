/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const path = require('path')

class HandleAfterGet {
  /**
   *
   * @param {InitCore} core
   */
  apply(initCore) {
    initCore.hooks.afterGet.tapPromise('HandleAfterGet', async (core) => {
      const { manager } = core
      const blockName = core.pullBlockData.block_name
      core.manager?.updateConfig({
        dependencies: {
          ...manager.config.dependencies,
          [blockName]: {
            directory: path.relative(path.resolve(), path.resolve(blockName)),
          },
        },
      })
    })
  }
}

module.exports = HandleAfterGet
