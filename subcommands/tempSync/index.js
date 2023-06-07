/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-continue */

const chalk = require('chalk')
const path = require('path')
const { existsSync } = require('fs')
// const { logFail } = require('../../utils')
const createBBModules = require('./createBBModules')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')
const { configstore } = require('../../configstore')
const { headLessConfigStore } = require('../../configstore')
const syncOrphanBranch = require('./syncOrphanBranches')
const { setVisibilityAndDefaultBranch } = require('./createBBModules/util')
const syncBlocks = require('../../utils/syncBlocks')

const tempSync = async (blockName, options) => {
  const { returnOnError } = options || {}
  try {
    const rootConfigPath = path.resolve(process.cwd(), 'block.config.json')
    const bbModulesPath = path.resolve(process.cwd(), 'bb_modules')
    const configFactory = await ConfigFactory.create(rootConfigPath)

    const { manager: configManager } = configFactory
    const repoUrl = configManager.config.source.https

    const parent = await configManager.findMyParentPackage()

    if (!(configManager instanceof PackageConfigManager) || parent.data.parentPackageFound !== false) {
     throw new Error("Please call sync from the root package block..")
    }

    const { defaultBranch} = await setVisibilityAndDefaultBranch({
      configstore,
      repoUrl,
      headLessConfigStore,
    })

    const bbModulesExists = existsSync(bbModulesPath)

    const bbModulesData = await createBBModules({
      bbModulesPath,
      rootConfig: configManager.config,
      bbModulesExists,
      defaultBranch,
    })

    syncBlocks(bbModulesData.blockNameArray, bbModulesData.apiPayload, bbModulesData.currentSpaceID,returnOnError)

    // return

    await syncOrphanBranch({ ...bbModulesData, bbModulesPath })
  } catch (error) {
    // returnOnError to throw error if called from other commands
    if (returnOnError) throw new Error(`Syncing failed! Please run bb sync and try again `)
    console.log(chalk.red(error.message))
  }
}

module.exports = tempSync
