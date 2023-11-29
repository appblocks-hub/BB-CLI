/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const BlockConfigManager = require('../../../utils/configManagers/blockConfigManager')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const { groupSatisfies, nameSatisfies, typeSatisfies } = require('../utils')

class HandleBeforeExec {
  /**
   *
   * @param {ExecCore} core
   */
  apply(execCore) {
    execCore.hooks.beforeExec.tapPromise('HandleBeforeExec', async (core) => {
      const { manager, cmdOpts } = core
      const { groups, inside, types } = cmdOpts

      /**
       * @type {Array<string>}
       */
      const roots = []

      // If inside a package, traverse the tree and build pathList
      if (manager instanceof PackageConfigManager) {
        core.logger.info('User is inside a package')
        roots.push(manager)
        await manager.refreshConfig()
        for (; roots.length > 0; ) {
          const root = roots.pop()
          for await (const m of root.getDependencies()) {
            if (m instanceof PackageConfigManager) {
              roots.push(m)
              await manager.refreshConfig()
            }
            if (!groupSatisfies(m, groups)) continue
            if (!nameSatisfies(m, inside)) continue
            if (!typeSatisfies(m, types)) continue
            core.pathList.push(m)
          }
        }
      }

      if (manager instanceof BlockConfigManager) {
        core.logger.info('User is inside a block')
        // If inside a block, Check if conditions satisfy
        if (!groupSatisfies(manager, groups)) {
          console.log(`You are inside a block (${manager.config.name}) & is not inside any of the given groups`)
        }
        if (!nameSatisfies(manager, inside)) {
          console.log(
            `You are inside a block (${manager.config.name}) & it does not match any of the given block names`
          )
        }
        if (!typeSatisfies(manager, types)) {
          console.log(
            `You are inside a block (${manager.config.name}) & it does not match any of the given block types`
          )
        }
        // if all conditions satisfy, add current block directory to pathList

        core.pathList.push(manager)
      }
    })
  }
}

module.exports = HandleBeforeExec
