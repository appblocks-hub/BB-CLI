/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { existsSync, rmSync } = require('fs')
const { configstore, headLessConfigStore } = require('../../../configstore')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const RawPackageConfigManager = require('../../../utils/configManagers/rawPackageConfigManager')
const { setVisibilityAndDefaultBranch } = require('../utils/createBBModuleUtil')
const { getBBFolderPath, BB_FOLDERS } = require('../../../utils/bbFolders')
const { isCleanBlock } = require('../../../utils/gitCheckUtils')

/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

class HandleBeforeSync {
  /**
   *
   * @param {SyncCore} core
   */
  apply(syncCore) {
    syncCore.hooks.beforeSync.tapPromise('HandleBeforeSync', async (core) => {
      const { manager, cmdOpts, cmdArgs } = core
      const { returnOnError, clearCache } = cmdOpts || {}
      const [blockName] = cmdArgs || []

      core.bbModulesPath = getBBFolderPath(BB_FOLDERS.BB_MODULES)

      // clear bb modules if clearCache is true
      if (clearCache && existsSync(core.bbModulesPath)) {
        rmSync(core.bbModulesPath, { recursive: true })
      }

      if (manager.config.type === 'containerized') core.preview = true

      try {
        isCleanBlock(manager.directory, blockName)
      } catch (error) {
        console.log(chalk.yellow(error.message?.replace('Error: ', '')))
        console.log(chalk.dim('Sync will be proceeded with last updated main branch '))
      }

      const repoUrl = manager.config.source.https

      if (!repoUrl) throw new Error('No git source found. Please run bb connect-remote and bb push and try again.')

      const parent = await manager.findMyParentPackage()

      if (
        !(manager instanceof PackageConfigManager || manager instanceof RawPackageConfigManager) ||
        parent.data.parentPackageFound !== false
      ) {
        throw new Error('Please call sync from the root package block..')
      }

      const { defaultBranch } = await setVisibilityAndDefaultBranch({
        configstore,
        repoUrl,
        cwd: manager.directory,
        headLessConfigStore: headLessConfigStore(),
      })

      core.defaultBranch = defaultBranch

      core.createBBModulesData = {
        bbModulesPath: core.bbModulesPath,
        rootConfig: manager.config,
        bbModulesExists: existsSync(core.bbModulesPath),
        defaultBranch,
        returnOnError,
        blockName,
        preview: core.preview,
      }
    })
  }
}

module.exports = HandleBeforeSync
