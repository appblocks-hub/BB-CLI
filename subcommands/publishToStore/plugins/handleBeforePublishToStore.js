/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const { readInput } = require('../../../utils/questionPrompts')
const { getBlockVersions } = require('../utils')

class HandleBeforePublishToStore {
  /**
   *
   * @param {PublishToStoreCore} core
   */
  apply(publishToStoreCore) {
    publishToStoreCore.hooks.beforePublishToStore.tapPromise('HandleBeforePublishToStore', async (core) => {
      const { manager, cmdArgs, cmdOpts } = core
      const [bkName] = cmdArgs || []
      const { version } = cmdOpts || {}

      const blockName = bkName || manager.config.name

      let blockManager

      if (blockName === manager.config.name) {
        blockManager = manager
      } else {
        blockManager = await manager.getAnyBlock(blockName)
        if (!blockManager) throw new Error(`${blockName} block not found`)
      }

      if (manager.config.repoType !== 'mono') {
        throw new Error(`This command is only supported for monorepo`)
      }

      const versionData = await getBlockVersions(blockManager.config.blockId, version)

      const blockDisplayName = await readInput({
        name: 'blockDisplayName',
        message: 'Enter the block display name',
        validate: (input) => {
          if (!input?.length > 0) return `Please enter a non empty block display name`
          return true
        },
      })

      const blockDevelopmentCost = await readInput({
        name: 'blockDevelopmentCost',
        message: 'Enter the block development cost in USD (optional)',
      })

      const blockDevelopmentEffort = await readInput({
        name: 'blockDevelopmentCost',
        message: 'Enter the block development effort in hours (optional)',
      })

      core.publishData = {
        block_id: blockManager.config.blockId,
        item_name: blockDisplayName,
        development_cost: parseFloat(blockDevelopmentCost),
        development_effort: parseFloat(blockDevelopmentEffort),
        block_version: versionData.id,
      }
    })
  }
}

module.exports = HandleBeforePublishToStore
