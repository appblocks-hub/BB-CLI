/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const chalk = require('chalk')
const { generateOrphanBranch } = require('../utils/syncOrphanBranchesUtil')

class HandleSyncOrphanBranches {
  /**
   *
   * @param {SyncCore} core
   */
  apply(syncCore) {
    syncCore.hooks.afterSync.tapPromise('HandleSyncOrphanBranches', async (core) => {
      const { syncLogs, preview,  bbModulesPath, bbModulesData } = core
      const { blockMetaDataMap, repoUrl } = bbModulesData
      const nonAvailableBlockNames = syncLogs?.apiLogs?.non_available_block_names ?? {}
      const errors = []

      await Promise.all(
        Object.values(blockMetaDataMap).map(async (block) => {
          const blockName = block.blockManager.config.name
          core.spinnies.add(`${blockName}`, { text: `Syncing ${blockName}` })
          try {
            if (Object.prototype.hasOwnProperty.call(nonAvailableBlockNames, blockName)) {
              const e = new Error(`${blockName} block name already taken`)
              e.name = 'noName'
              throw e
            }
            await generateOrphanBranch({ bbModulesPath, block, repoUrl, blockMetaDataMap, preview })
            core.spinnies.succeed(`${blockName}`, { text: `${blockName} synced successfully` })
          } catch (error) {
            if (error.name !== 'noName') errors.push(error)
            const errMessage = error.name === 'noName' ? error.message : `Malformed bb_modules/${blockName}`
            core.spinnies.fail(`${blockName}`, { text: chalk.red(errMessage) })
          }
        })
      )
      if (errors.length > 0) {
        throw new Error(chalk.gray(`Malformed bb_modules found. Please run bb sync --clear-cache`))
      }
    })
  }
}

module.exports = HandleSyncOrphanBranches
