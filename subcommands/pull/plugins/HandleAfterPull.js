/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const path = require('path')
const chalk = require('chalk')
const { nanoid } = require('nanoid')
const { existsSync, rm, readFileSync, writeFileSync, rmSync } = require('fs')
const { blockTypeInverter } = require('../../../utils/blockTypeInverter')

// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')
const { BB_CONFIG_NAME } = require('../../../utils/constants')
const ConfigFactory = require('../../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')

class HandleAfterPull {
  /**
   *
   * Update config on all blocks
   */
  async updateConfigUnderPackage(options) {
    const { isOutOfContext, packageManager } = options
    for await (const manager of packageManager.getDependencies()) {
      if (!manager?.config) continue

      const newConfig = {
        blockId: nanoid(),
        source: { branch: `block_${manager.config.name}` },
      }

      if (!isOutOfContext) {
        newConfig.source = packageManager.config.source
        newConfig.source.branch = `block_${manager.config.name}`
        newConfig.parentBlockIDs = [...packageManager.config.parentBlockIDs, packageManager.config.blockId]
      }

      await manager.updateConfig(newConfig)

      if (manager.isPackageConfigManager) {
        await this.updateConfigUnderPackage({ isOutOfContext, packageManager: manager })
      }
    }
  }

  /**
   *
   * @param {PullCore} pullCore
   */
  apply(pullCore) {
    pullCore.hooks.afterPull.tapPromise(
      'HandleAfterPull',
      async (
        /**
         * @type {PullCore}
         */
        core
      ) => {
        const { blockDetails } = core
        const blockConfigPath = path.join(core.blockClonePath, BB_CONFIG_NAME)
        let blockConfig = {}

        try {
          blockConfig = JSON.parse(readFileSync(blockConfigPath, 'utf-8'))
        } catch (err) {
          if (err.code === 'ENOENT') {
            console.log(chalk.dim('Pulled block has no config file, adding a new one'))
            const language = blockDetails.block_type < 4 ? 'js' : 'nodejs'
            blockConfig = {
              type: blockTypeInverter(blockDetails.block_type),
              language,
              start: language === 'js' ? 'npx webpack-dev-server' : 'node index.js',
              build: language === 'js' ? 'npx webpack' : '',
              postPull: 'npm i',
            }
          }
        }

        if (core.createCustomVariant) {
          blockConfig.variantOf = blockDetails.version_id

          if (blockDetails.purchased_parent_block_id) {
            blockConfig.variantOfBlockId = blockDetails.purchased_parent_block_id
          } else {
            blockConfig.variantOfBlockId = blockDetails.block_id
          }

          blockConfig.blockId = nanoid()
          blockConfig.name = blockDetails.new_variant_block_name || blockDetails.block_name
          blockConfig.source = {
            branch: `block_${blockConfig.name}`,
          }
          if (!core.isOutOfContext) {
            blockConfig.source = { ...core.packageConfig.source }
            blockConfig.source.branch = `block_${blockConfig.name}`
            blockConfig.parentBlockIDs = [...core.packageConfig.parentBlockIDs, core.packageConfig.blockId]
          }
        } else {
          if (blockDetails.version_number) blockConfig.version = blockDetails.version_number
          blockConfig.name = blockDetails.block_name
        }

        writeFileSync(blockConfigPath, JSON.stringify(blockConfig, null, 2))

        if (core.blockDetails.pull_by_config_folder_name) {
          const tmpPath = path.join(core.tempAppblocksFolder, core.blockDetails.pull_by_config_folder_name)
          if (blockDetails.pull_by_config && existsSync(tmpPath)) {
            rm(tmpPath, { recursive: true, force: true }, () => {})
          }
        }

        if (!core.isOutOfContext) {
          const { err } = await core.packageManager.addBlock(blockConfigPath)
          if (err) throw err
        }

        if (core.blockDetails.block_type === 1 && core.createCustomVariant) {
          const { manager: pkManager, error } = await ConfigFactory.create(blockConfigPath)
          if (error) throw error
          if (!(pkManager instanceof PackageConfigManager)) {
            throw new Error(`Block config of ${pkManager.config.name} is not of a package block`)
          }
          await this.updateConfigUnderPackage({ packageManager: pkManager, isOutOfContext: core.isOutOfContext })
        }

        if (core.createCustomVariant) {
          const gitPath = path.join(core.blockClonePath, '.git')
          if (existsSync(gitPath)) rmSync(gitPath, { recursive: true })
        }

        // core.spinnies.add('packageInstaller', { text: 'Installing dependencies' })
        // const { installer } = getNodePackageInstaller()

        // const cmdRes = await runBash(installer)
        // if (cmdRes.status === 'failed') {
        //   core.spinnies.fail('packageInstaller', { text: cmdRes.msg })
        // } else {
        //   core.spinnies.succeed('packageInstaller', { text: 'Dependencies installed' })
        // }
        // core.spinnies.remove('packageInstaller')
      }
    )
  }
}

module.exports = HandleAfterPull
