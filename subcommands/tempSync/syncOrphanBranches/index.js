/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../../loader')
const { generateOrphanBranch } = require('./util')

const syncOrphanBranch = async (options) => {
  const { blockMetaDataMap, bbModulesPath, repoUrl,nonAvailableBlockNames } = options

  await Promise.all(
    Object.values(blockMetaDataMap).map(async (block) => {
      const blockName = block.blockManager.config.name
      if(!(Object.prototype.hasOwnProperty.call(nonAvailableBlockNames,blockName))){
      spinnies.add(`${blockName}`, { text: `Syncing ${blockName}` })
      await generateOrphanBranch({ bbModulesPath, block, repoUrl, blockMetaDataMap })
      spinnies.succeed(`${blockName}`, { text: `${blockName} synced successfully` })
      }
    })
  )
}

module.exports = syncOrphanBranch
