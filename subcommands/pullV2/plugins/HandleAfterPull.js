/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const chalk = require('chalk')
const { existsSync, rm, readFileSync, writeFileSync } = require('fs')
const path = require('path')
const { blockTypeInverter } = require('../../../utils/blockTypeInverter')
const convertGitSshUrlToHttps = require('../../../utils/convertGitUrl')
const { getBlockMetaData } = require('../../../utils/registryUtils')

// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')

class HandleAfterPull {
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

        const blockConfigPath = path.join(core.blockClonePath, 'block.config.json')

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
          if (blockDetails.purchased_parent_block_id) {
            core.spinnies.add('pbRes', { text: 'Getting parent block meta data ' })
            const parentBlockRes = await getBlockMetaData(blockDetails.purchased_parent_block_id)
            core.spinnies.remove('pbRes')
            if (parentBlockRes.data.err) throw new Error(parentBlockRes.data.msg)
            const pbData = parentBlockRes.data.data

            blockConfig.parent = {
              id: blockDetails.purchased_parent_block_id,
              name: pbData.block_name,
              version: blockDetails.version_number,
              version_id: blockDetails.version_id,
            }
          } else {
            blockConfig.parent = {
              id: blockDetails.block_id,
              name: blockDetails.block_name,
              version: blockDetails.version_number,
              version_id: blockDetails.version_id,
            }
          }
          blockConfig.source = {}
        } else {
          blockConfig.version = blockDetails.version_number
          blockConfig.source = { https: convertGitSshUrlToHttps(blockDetails.git_url), ssh: blockDetails.git_url }
        }

        blockConfig.name = blockDetails.new_variant_block_name || blockDetails.block_name
        writeFileSync(blockConfigPath, JSON.stringify(blockConfig, null, 2))

        if (core.blockDetails.pull_by_config_folder_name) {
          const tmpPath = path.join(core.tempAppblocksFolder, core.blockDetails.pull_by_config_folder_name)
          if (blockDetails.pull_by_config && existsSync(tmpPath)) {
            rm(tmpPath, { recursive: true, force: true }, () => {})
          }
        }

        if (!core.appConfig.isOutOfContext) {
          core.appConfig.addBlock({
            directory: path.relative(core.cwd, core.blockClonePath),
            meta: blockConfig,
          })
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
