/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { spinnies } = require('../../../loader')
const { generateOrphanBranch } = require('./util')

const syncOrphanBranch = async (options) => {
  const { blockMetaDataMap, bbModulesPath, repoUrl, nonAvailableBlockNames } = options
  const errors = []

  await Promise.all(
    Object.values(blockMetaDataMap).map(async (block) => {
      const blockName = block.blockManager.config.name
      spinnies.add(`${blockName}`, { text: `Syncing ${blockName}` })
      try {
        if (Object.prototype.hasOwnProperty.call(nonAvailableBlockNames, blockName)) {
          const e = new Error(`${blockName} block name already taken`)
          e.name = 'noName'
          throw e
        }
        await generateOrphanBranch({ bbModulesPath, block, repoUrl, blockMetaDataMap })
        spinnies.succeed(`${blockName}`, { text: `${blockName} synced successfully` })
      } catch (error) {
        if (error.name !== 'noName') errors.push(error)
        const errMessage = error.name === 'noName' ? error.message : `Malformed bb_modules/${blockName}`
        spinnies.fail(`${blockName}`, { text: chalk.red(errMessage) })
      }
    })
  )

  return errors
}

module.exports = syncOrphanBranch
