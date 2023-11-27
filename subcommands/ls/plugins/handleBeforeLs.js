/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const { checkBlocksSyncedApi } = require("../../../utils/api")
const { axios } = require("../../../utils/axiosInstances")

class HandleBeforeLs {
  /**
   *
   * @param {LsCore} core
   */
  apply(lsCore) {
    lsCore.hooks.beforeLs.tapPromise('HandleBeforeLs', async (core) => {
      const { manager } = core
      const { rootManager } = await manager.findMyParents()

      try {
        core.spinnies.add('syncStatus', { text: 'Checking blocks sync status' })
        // check blocks are synced
        const memberBlocks = await rootManager.getAllLevelAnyBlock()
        const blockIds = [...memberBlocks].map((m) => m?.config.blockId)
        const checkRes = await axios.post(checkBlocksSyncedApi, { block_ids: blockIds })
        core.syncedBlockIds = checkRes.data?.data?.map((b) => b.id) || []
        core.spinnies.succeed('syncStatus', { text: 'Sync status retrieved successfully' })
      } catch (error) {
        core.spinnies.add('syncStatus')
        core.spinnies.fail('syncStatus', { text: 'Error getting block synced status' })
      }
    })
  }
}

module.exports = HandleBeforeLs
