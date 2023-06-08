/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { generateOrphanBranch } = require('./util')

const syncOrphanBranch = async (options) => {
  const { blockMetaDataMap, bbModulesPath, repoUrl } = options

  const blocksArray = Object.keys(blockMetaDataMap)
  await Promise.all(
    Object.values(blockMetaDataMap).map(async (block) => {
      try {
        await generateOrphanBranch({ bbModulesPath, block, repoUrl, blockMetaDataMap })
        return true
      } catch (err) {
        console.log(`Error creating orphan branch for ${block.blockManager.config.name}`)
        return false
      }
    })
  )
}

module.exports = syncOrphanBranch
