/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-continue */

const path = require('path')
const { existsSync } = require('fs')
// const { execSync } = require('child_process')
// const { logFail } = require('../../utils')
const createBBModules = require('./createBBModules')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')
const { configstore } = require('../../configstore')
const { headLessConfigStore } = require('../../configstore')
const syncOrphanBranch = require('./syncOrphanBranches')
const { setVisibilityAndDefaultBranch } = require('./createBBModules/util')
const { spinnies } = require('../../loader')
const syncBlocks = require('../../utils/syncBlocks')
// eslint-disable-next-line prefer-const
let syncLogs = {}

const tempSync = async (blockName, options) => {
  const { returnOnError } = options || {}
  try {
    const rootConfigPath = path.resolve('block.config.json')
    const bbModulesPath = path.resolve('bb_modules')
    const { manager: configManager, error } = await ConfigFactory.create(rootConfigPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      throw new Error('Cannot run bb command outside of bb context')
    }

    const repoUrl = configManager.config.source.https

    if (!repoUrl) throw new Error('No git source found. Please run bb connect-remote and try again')

    const parent = await configManager.findMyParentPackage()

    if (!(configManager instanceof PackageConfigManager) || parent.data.parentPackageFound !== false) {
      throw new Error('Please call sync from the root package block..')
    }

    //  check origin exist
    // const cmdCheckMain = 'git ls-remote --heads --quiet origin main'
    // const existBranch = execSync(cmdCheckMain, { cwd: configManager.directory }).toString().trim() !== ''
    // if (!existBranch) throw new Error('Remote main branch not found! Please run bb push -f and try again')

    const { defaultBranch } = await setVisibilityAndDefaultBranch({
      configstore,
      repoUrl,
      headLessConfigStore: headLessConfigStore(),
    })

    // spinnies.update('bb', { text: 'Generating bb modules' })
    const bbModulesExists = existsSync(bbModulesPath)
    const bbModulesData = await createBBModules({
      bbModulesPath,
      rootConfig: configManager.config,
      bbModulesExists,
      defaultBranch,
    })

    await syncBlocks(
      bbModulesData.blockNameArray,
      bbModulesData.apiPayload,
      bbModulesData.currentSpaceID,
      returnOnError,
      syncLogs,
      bbModulesData.rootPackageBlockID
    )
    if (syncLogs?.apiLogs?.error) {
      console.log('Appblocks sync failed')
      throw new Error('')
    }
    const nonAvailableBlockNames = syncLogs?.apiLogs?.non_available_block_names ?? {}
    if (Object.keys(nonAvailableBlockNames).length > 0) {
      console.log(`Appblocks sync failed for ${Object.keys(nonAvailableBlockNames).join(',')}`)
    }

    await syncOrphanBranch({ ...bbModulesData, bbModulesPath, nonAvailableBlockNames })
  } catch (error) {
    // returnOnError to throw error if called from other commands
    spinnies.stopAll()
    if (returnOnError) {
      throw new Error(`Syncing failed! Please run bb sync and try again `)
    }
  }
}

module.exports = tempSync
