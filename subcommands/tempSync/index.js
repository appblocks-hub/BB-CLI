/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-continue */

const path = require('path')
const { existsSync } = require('fs')
const { execSync } = require('child_process')
// const { logFail } = require('../../utils')
const createBBModules = require('./createBBModules')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')
const { configstore } = require('../../configstore')
const { headLessConfigStore } = require('../../configstore')
const syncOrphanBranch = require('./syncOrphanBranches')
const { setVisibilityAndDefaultBranch } = require('./createBBModules/util')
const syncBlocks = require('../../utils/syncBlocks')
const { spinnies } = require('../../loader')

const tempSync = async (blockName, options) => {
  const { returnOnError } = options || {}
  try {
    spinnies.add('bb', { text: 'Initializing config manager' })

    const rootConfigPath = path.resolve(process.cwd(), 'block.config.json')
    const bbModulesPath = path.resolve(process.cwd(), 'bb_modules')
    const configFactory = await ConfigFactory.create(rootConfigPath)

    const { manager: configManager } = configFactory
    const repoUrl = configManager.config.source.https

    if (!repoUrl) throw new Error('No git source found. Please run bb connect-remote and try again')

    const parent = await configManager.findMyParentPackage()

    if (!(configManager instanceof PackageConfigManager) || parent.data.parentPackageFound !== false) {
      throw new Error('Please call sync from the root package block..')
    }

    //  check origin exist
    const cmdCheckMain = 'git ls-remote --heads --quiet origin main'
    const existBranch = (await execSync(cmdCheckMain, { cwd: configManager.directory }).toString().trim()) !== ''
    if (!existBranch) throw new Error('Remote main branch not found! Please run bb push -f and try again')

    const { defaultBranch } = await setVisibilityAndDefaultBranch({
      configstore,
      repoUrl,
      headLessConfigStore,
    })

    spinnies.update('bb', { text: 'Generating bb modules' })
    const bbModulesExists = existsSync(bbModulesPath)
    const bbModulesData = await createBBModules({
      bbModulesPath,
      rootConfig: configManager.config,
      bbModulesExists,
      defaultBranch,
    })

    spinnies.update('bb', { text: 'Syncing blocks to registry' })
    syncBlocks(bbModulesData.blockNameArray, bbModulesData.apiPayload, bbModulesData.currentSpaceID, returnOnError)

    // return
    spinnies.update('bb', { text: 'Syncing orphan branches' })
    await syncOrphanBranch({ ...bbModulesData, bbModulesPath })
    spinnies.succeed('bb', { text: 'Sync completed successfully' })
  } catch (error) {
    spinnies.stopAll()
    // returnOnError to throw error if called from other commands
    if (returnOnError) throw new Error(`Syncing failed! Please run bb sync and try again `)

    spinnies.add('bb', { text: 'Syncing ' })
    spinnies.fail('bb', { text: error.message })
  }
}

module.exports = tempSync
