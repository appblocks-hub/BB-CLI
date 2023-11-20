/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const { getBlockFromStoreFn } = require('../../../utils/registryUtils')

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

      if (manager && core.pullBlockData.block_type === 9) {
        throw new Error('Pulling raw package is not allowed inside package context')
      }

      if (manager) {
        const { rootManager } = await manager.findMyParents()
        core.pullBlockData.rootParentManager = rootManager
      }
    })
  }
}

module.exports = HandleBeforeGet
