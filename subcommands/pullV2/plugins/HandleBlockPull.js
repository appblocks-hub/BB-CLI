/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const path = require('path')
const { existsSync } = require('fs')
const { GitManager } = require('../../../utils/gitManagerV2')
const { pullSourceCodeFromAppblock } = require('../utils/sourceCodeUtil')
// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')

class HandleBlockPull {
  /**
   *
   * @param {PullCore} pullCore
   */
  apply(pullCore) {
    pullCore.hooks.beforePull.tapPromise(
      'HandleBlockPull',
      async (
        /**
         * @type {PullCore}
         */
        core
      ) => {
        if (core.blockDetails.blockType === 'package') return

        const cloneGitUrl = core.blockDetails.forked_git_url || core.blockDetails.git_url
        const cloneBlockName = core.blockDetails.new_variant_block_name || core.blockDetails.block_name
        const clonePath = path.join(core.cwd, cloneBlockName)

        // check if clone folder already exist
        if (existsSync(clonePath)) {
          throw new Error(`Folder already exist`)
        }

        if (core.blockDetails.is_purchased_variant && core.blockDetails.block_visibility === 5) {
          // Block source code will be downloaded form s3
          core.spinnies.add('pab', { text: 'pulling block source code' })
          await pullSourceCodeFromAppblock({
            blockFolderPath: core.blockClonePath,
            blockDetails: core.blockDetails,
            appId: core.appData.app_id,
          })
          core.spinnies.remove('pab')
          return
        }

        // Clone repo from git
        core.spinnies.add('fork', { text: `Cloning repo ${core.blockDetails.block_name}` })

        const git = new GitManager(core.cwd, cloneGitUrl)
        await git.clone(clonePath)

        if (core.blockDetails.version_number) {
          await git.fetch('--all --tags')
          await git.checkoutTag(core.blockDetails.version_number)
        }

        core.spinnies.succeed('fork', { text: `Block ${core.blockDetails.block_name} cloned successfully` })
        core.blockDetails.final_block_path = clonePath
        core.blockClonePath = clonePath
      }
    )
  }
}

module.exports = HandleBlockPull
