/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const { existsSync } = require('fs')
const path = require('path')
const { getBlockFromStoreFn } = require('../../../utils/registryUtils')
const checkAndSetUserSpacePreference = require('../../../utils/checkAndSetUserSpacePreference')

class HandleBeforeGet {
  /**
   *
   * @param {InitCore} core
   */
  apply(initCore) {
    initCore.hooks.beforeGet.tapPromise('HandleBeforeGet', async (core) => {
      const { logger, manager } = core
      const [pullBlock] = core.cmdArgs

      // eslint-disable-next-line prefer-const
      let [spaceName, packageName, blockName] = pullBlock.split('/')

      if (spaceName?.includes('@')) {
        spaceName = spaceName.replace('@', '')
      } else {
        throw new Error('Please provide the space name\n eg: bb get @<space_name>/package_name/block_name')
      }

      if (!blockName) blockName = packageName

      core.pullBlockData = { spaceName, packageName, blockName }

      const {
        data: { err, data },
      } = await getBlockFromStoreFn(blockName, spaceName, packageName)

      if (err) {
        console.log(err)
        const errMsg = err.response?.data?.msg || err.message || err
        logger.error(errMsg)
        throw errMsg
      }

      const { err: error, msg, data: blockData } = data

      if (error) {
        const errMsg = `Error from server: ${msg}`
        logger.error(errMsg)
        throw errMsg
      }

      core.pullBlockData = { ...core.pullBlockData, ...blockData }

      const clonePath = path.join(core.cwd, blockName)

      if (manager && core.pullBlockData.block_type === 9) {
        throw new Error('Pulling containerized package is not allowed inside package context')
      }

      if (manager) {
        await checkAndSetUserSpacePreference('get')
        const { rootManager } = await manager.findMyParents()
        core.pullBlockData.rootParentManager = rootManager
      } else {
        if (![1, 9].includes(core.pullBlockData.block_type)) {
          throw new Error('Pulling package and containerized blocks are allowed in outside context')
        }

        if (existsSync(clonePath)) {
          throw new Error(`Folder ${blockName} already exists`)
        }
      }
    })
  }
}

module.exports = HandleBeforeGet
