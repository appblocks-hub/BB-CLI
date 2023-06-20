/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const path = require('path')
const { tmpdir } = require('os')
const { existsSync, cpSync, mkdirSync, rmSync } = require('fs')
const { GitManager } = require('../../../utils/gitManagerV2')
const { pullSourceCodeFromAppblock } = require('../utils/sourceCodeUtil')
// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')
const { BB_CONFIG_NAME } = require('../../../utils/constants')
const ConfigFactory = require('../../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')

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
        if (core.blockDetails.block_type === 1) return

        const cloneGitUrl = core.blockDetails.forked_git_url || core.blockDetails.git_url
        const clonePath = core.blockClonePath

        // check if clone folder already exist
        if (existsSync(clonePath)) throw new Error(`Folder already exist`)

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
        core.spinnies.add('pull', { text: `Cloning repo ${core.blockDetails.block_name}` })

        const git = new GitManager(core.cwd, cloneGitUrl)

        // TODO: find a better approach to clone block sparse checkout

        // const tmpClonePath = path.join(tmpdir(), '_appblocks_', '')
        // await git.sparseClone(tmpClonePath)
        // git.cd(tmpClonePath)

        // const { data, error } = await readJsonAsync(path.join(tmpClonePath, 'block.config.json'))
        // let repoType = core.packageConfig?.repoType
        // if (!error && data) {
        //   repoType = data.repoType
        // }

        // if (repoType === 'mono') {
        //   await git.sparseCheckout('init', '--cone')
        //   // check if blockExist()
        //   await git.sparseCheckout('set', core.blockDetails.block_name)
        //   cpSync(path.join(tmpClonePath), clonePath)
        // } else {
        //   await git.sparseCheckout('disable')
        //   await git.readTree()
        //   cpSync(tmpClonePath, clonePath)
        // }

        const tmpClonePath = path.resolve(tmpdir(), '_appblocks_', core.pullBlockName)
        if (existsSync(tmpClonePath)) rmSync(tmpClonePath, { recursive: true })
        if (!existsSync(path.dirname(tmpClonePath))) mkdirSync(path.dirname(tmpClonePath), { recursive: true })

        await git.clone(tmpClonePath)

        const configPath = path.join(tmpClonePath, BB_CONFIG_NAME)
        console.log(configPath)
        const { manager: configManager, error } = await ConfigFactory.create(configPath)
        if (error) {
          throw new Error('Pulling block is not in appblock standard structure. Pull aborted!')
        }
        // TODO multi repo

        // if mono repo
        if (!(configManager instanceof PackageConfigManager)) {
          throw new Error('Pulling block is not in appblock standard structure. No root config found. Pull aborted!')
        }

        const block = await configManager.getAnyBlock(core.blockDetails.block_name)

        if (core.blockPullKeys.blockVersion) {
          // if mono repo
          git.checkoutBranch(core.blockPullKeys.blockVersion)

          // TODO handle multi
          // await git.fetch('--all --tags')
          // await git.checkoutTag(core.blockPullKeys.blockVersion)
        }

        cpSync(block.directory, clonePath, { recursive: true })
        rmSync(tmpClonePath, { recursive: true })

        core.spinnies.succeed('pull', { text: `Block ${core.blockDetails.block_name} cloned successfully` })
        core.blockDetails.final_block_path = clonePath
        core.blockClonePath = clonePath
      }
    )
  }
}

module.exports = HandleBlockPull
