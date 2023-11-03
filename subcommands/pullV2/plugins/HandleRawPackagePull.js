/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../../loader')
const { cloneBlock } = require('../utils')

// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')

class HandleRawPackagePull {
  /**
   *
   * @param {PullCore} pullCore
   */
  apply(pullCore) {
    pullCore.hooks.beforePull.tapPromise(
      'HandleRawPackagePull',
      async (
        /**
         * @type {PullCore}
         */
        core
      ) => {
        const { blockDetails } = core
        if (blockDetails.block_type !== 9) return

        // Handle package block

        if (core.blockDetails.is_purchased_variant) {
          // Block source code will be downloaded form s3
          throw new Error('Purchased package pull is still in progress!!!')
        }

        const { cloneFolder: packageFolderPath } = await cloneBlock({
          blockName: blockDetails.block_name,
          blockClonePath: core.blockClonePath,
          blockVersion: core.blockPullKeys.blockVersion,
          gitUrl: blockDetails.git_url,
          rootPath: core.cwd,
          isRoot: core.blockPullKeys.rootPackageName === core.blockPullKeys.blockName,
          tmpPath: core.tempAppblocksFolder,
        })

        core.blockClonePath = packageFolderPath

        spinnies.add('pbp', { text: 'Pulled package block successfully ' })
        spinnies.succeed('pbp', { text: 'Pulled package block successfully ' })
      }
    )
  }
}

module.exports = HandleRawPackagePull
