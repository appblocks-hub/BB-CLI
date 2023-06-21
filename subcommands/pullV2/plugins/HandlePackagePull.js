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

class HandlePackagePull {
  /**
   *
   * @param {PullCore} pullCore
   */
  apply(pullCore) {
    pullCore.hooks.beforePull.tapPromise(
      'HandlePackagePull',
      async (
        /**
         * @type {PullCore}
         */
        core
      ) => {
        const { blockDetails } = core
        if (blockDetails.block_type !== 1) return

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

        // spinnies.add('pab', { text: 'Getting package config data ' })
        // const { data: appConfigData, error } = await post(appBlockGetAppConfig, {
        //   block_id: blockDetails.block_id,
        //   block_version_id: blockDetails.version_id,
        // })
        // spinnies.remove('pab')
        // if (error) throw error
        // const packageConfigData = appConfigData?.data?.app_config
        // if (!packageConfigData) throw new Error('No pull package block config found')

        // const { dependencies, repoType } = packageConfigData
        // const { blockTypes } = core.cmdOpts

        // if (dependencies && repoType !== 'mono') {
        //   await Promise.all(
        //     Object.values(dependencies).map(async (dep) => {
        //       const { type, name, source } = dep.meta
        //       if (blockTypes?.length && !blockTypes.includes(type)) return false
        //       await cloneBlock({ blockName: name, gitUrl: source.ssh, rootPath: packageFolderPath })
        //       return true
        //     })
        //   )
        // }

        spinnies.add('pbp', { text: 'Pulled package block successfully ' })
        spinnies.succeed('pbp', { text: 'Pulled package block successfully ' })
      }
    )
  }
}

module.exports = HandlePackagePull
