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
  for (const item of blocksArray) {
    const block = blockMetaDataMap[item]

    try {
      await generateOrphanBranch({ bbModulesPath, block, repoUrl, blockMetaDataMap })
    } catch (err) {
      console.log('error is \n', err)
      console.log(`error creating orphan branch for ${block.blockManager.config.name}`)
    }
  }
}

module.exports = syncOrphanBranch
