/* eslint-disable class-methods-use-this */
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const BlockConfigManager = require('../../../utils/configManagers/blockConfigManager')

class HandleBeforeRunTest {
  checkNameOption(core, cm) {
    const { inside } = core.cmdOpts
    if (inside.length === 0) return true
    return inside.includes(cm.config.name)
  }

  handleBlockManagerType(core, manager) {
    const { logger } = core
    logger.info('User is inside a block')
    if (!this.checkNameOption(core, manager)) {
      logger.info(`You are inside a block (${manager.config.name}) & it does not match any of the given block names`)
    }
    core.pathList.push(manager)
  }

  /**
   *
   * @param {InitCore} core
   */
  apply(initCore) {
    initCore.hooks.beforeRunTest.tapPromise('HandleBeforeRunTest', async (core) => {
      const { logger, manager } = core

      const roots = []
      if (manager instanceof PackageConfigManager) {
        logger.info('User is inside a package')
        roots.push(manager)
        for (; roots.length > 0; ) {
          const root = roots.pop()
          for await (const m of root.getDependencies()) {
            if (m instanceof PackageConfigManager) {
              logger.info('User is inside a package')
              roots.push(m)
            } else if (m instanceof BlockConfigManager) {
              this.handleBlockManagerType(core, m)
            }
          }
        }
      } else if (manager instanceof BlockConfigManager) {
        this.handleBlockManagerType(core, manager)
      }
    })
  }
}

module.exports = HandleBeforeRunTest
