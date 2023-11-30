/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const { readdirSync } = require('fs')
const path = require('path')
const { BB_FOLDERS } = require('../../../utils/bbFolders')
const { extensionOf, doesPathIncludeFolder } = require('../utils')
const RawPackageConfigManager = require('../../../utils/configManagers/rawPackageConfigManager')

class HandleBeforeFlush {
  getLogFiles(dir = '.') {
    return readdirSync(dir).reduce((acc, curr) => {
      const currPath = path.resolve(dir, curr)
      if (curr === BB_FOLDERS.BB) return acc.concat(this.getLogFiles(currPath))
      if (extensionOf(curr) === 'log') return acc.concat(currPath)
      if (curr === BB_FOLDERS.LOGS) return acc.concat(currPath)
      if (curr.endsWith(BB_FOLDERS.LOGS) && doesPathIncludeFolder(currPath, BB_FOLDERS.BB)) return acc.concat(currPath)
      return acc
    }, [])
  }

  /**
   *
   * @param {FlushCore} core
   */
  apply(flushCore) {
    flushCore.hooks.beforeFlush.tapPromise('HandleBeforeFlush', async (core) => {
      const { manager } = core

      let dir = '.'
      if (!(manager instanceof RawPackageConfigManager)) {
        const { rootManager } = await manager.findMyParents()
        dir = rootManager?.directory || dir
      }

      core.flushFiles = this.getLogFiles(dir)
    })
  }
}

module.exports = HandleBeforeFlush
