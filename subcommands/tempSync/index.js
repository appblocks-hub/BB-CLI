/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-continue */

const path = require('path')
const chalk = require('chalk')
const { existsSync, rmSync } = require('fs')
const createBBModules = require('./createBBModules')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')
const { configstore } = require('../../configstore')
const { headLessConfigStore } = require('../../configstore')
const syncOrphanBranch = require('./syncOrphanBranches')
const { setVisibilityAndDefaultBranch } = require('./createBBModules/util')
const { spinnies } = require('../../loader')
const syncBlocks = require('../../utils/syncBlocks')
const { Logger } = require('../../utils/loggerV2')
const { BB_FOLDERS, getBBFolderPath } = require('../../utils/bbFolders')
const RawPackageConfigManager = require('../../utils/configManagers/rawPackageConfigManager')
// eslint-disable-next-line prefer-const
let syncLogs = {}

const tempSync = async (blockName, options) => {
  const { logger } = new Logger('sync')
  logger.info('Sync started')
  const { returnOnError, clearCache } = options || {}
  let preview

  try {
    const rootConfigPath = path.resolve('block.config.json')
    const bbModulesPath = getBBFolderPath(BB_FOLDERS.BB_MODULES)

    // clear bb modules if clearCache is true
    if (clearCache && existsSync(bbModulesPath)) {
      rmSync(bbModulesPath, { recursive: true })
    }

    const { manager: configManager, error } = await ConfigFactory.create(rootConfigPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      throw new Error('Please run the command inside root package context ')
    }

    if (configManager.config.type === 'raw-package') {
      preview = true
    }

    const repoUrl = configManager.config.source.https

    if (!repoUrl) throw new Error('No git source found. Please run bb connect-remote and bb push and try again.')

    const parent = await configManager.findMyParentPackage()

    if (
      !(configManager instanceof PackageConfigManager || configManager instanceof RawPackageConfigManager) ||
      parent.data.parentPackageFound !== false
    ) {
      throw new Error('Please call sync from the root package block..')
    }

    const { defaultBranch } = await setVisibilityAndDefaultBranch({
      configstore,
      repoUrl,
      cwd: configManager.directory,
      headLessConfigStore: headLessConfigStore(),
    })

    // spinnies.update('bb', { text: 'Generating bb modules' })
    const bbModulesExists = existsSync(bbModulesPath)
    const bbModulesData = await createBBModules({
      bbModulesPath,
      rootConfig: configManager.config,
      bbModulesExists,
      defaultBranch,
      returnOnError,
      blockName,
      preview,
    })

    // Return if there are nothing to pull
    if (bbModulesData.noPullChanges && returnOnError) return

    // eslint-disable-next-line no-unreachable
    await syncBlocks(
      bbModulesData.blockNameArray,
      bbModulesData.apiPayload,
      bbModulesData.currentSpaceID,
      returnOnError,
      syncLogs,
      bbModulesData.rootPackageBlockID,
      bbModulesData.rootPackageName,
      blockName
    )

    if (syncLogs?.apiLogs?.error) {
      throw new Error(
        `${syncLogs?.apiLogs?.message}\n${chalk.gray(
          `Please check ${BB_FOLDERS.BB}/${BB_FOLDERS.SYNC_LOGS} for more details`
        )}`
      )
    }

    const nonAvailableBlockNames = syncLogs?.apiLogs?.non_available_block_names ?? {}
    const errors = await syncOrphanBranch({ ...bbModulesData, bbModulesPath, nonAvailableBlockNames, preview })

    if (errors.length > 0) {
      throw new Error(chalk.gray(`Malformed bb_modules found. Please run bb sync --clear-cache`))
    }
  } catch (error) {
    spinnies.stopAll()

    if (returnOnError) {
      // returnOnError to throw error if called from other commands
      throw new Error(`Syncing failed! Please run bb sync and try again `)
    }

    spinnies.add('sync')
    spinnies.fail('sync', { text: chalk.red(error.message) })
  }
}

module.exports = tempSync
