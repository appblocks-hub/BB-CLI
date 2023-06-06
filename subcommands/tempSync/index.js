/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-continue */

const chalk = require('chalk')
const { logFail } = require('../../utils')
const { readInput } = require('../../utils/questionPrompts')
const createBBModules = require('./createBBModules')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const path = require('path')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')
const { existsSync, writeFileSync } = require('fs')
const { isInRepo } = require('../../utils/Queries')
const { configstore } = require('../../configstore')
const { headLessConfigStore } = require('../../configstore')
const { default: axios } = require('axios')
const { githubGraphQl } = require('../../utils/api')
const { getGitHeader } = require('../../utils/getHeaders')
const syncOrphanBranch = require('./syncOrphanBranches')
const { setVisibilityAndDefaultBranch } = require('./createBBModules/util')
const syncBlocks = require('../../utils/syncBlocks')

const tempSync = async (blockName, options) => {
  try {
    const { environment, configName } = options

    const rootConfigPath = path.resolve(process.cwd(), 'block.config.json')
    const bbModulesPath = path.resolve(process.cwd(), 'bb_modules')
    let configFactory = await ConfigFactory.create(rootConfigPath)

    let { manager: configManager } = configFactory
    let repoUrl = configManager.config.source.https

    let parent = await configManager.findMyParentPackage()

    if (!configManager.manager instanceof PackageConfigManager || parent.data.parentPackageFound !== false) {
      logFail(`\nPlease call sync from the root package block..`)
      process.exit(1)
    }

    const { defaultBranch, repoVisibility } = await setVisibilityAndDefaultBranch({
      configstore,
      repoUrl,
      headLessConfigStore,
    })

    const bbModulesExists = existsSync(bbModulesPath)

    const bbModulesData = await createBBModules({
      bbModulesPath: bbModulesPath,
      rootConfig: configManager.config,
      bbModulesExists: bbModulesExists,
      defaultBranch,
      repoVisibility,
    })


    syncBlocks(bbModulesData.blockNameArray, bbModulesData.apiPayload, bbModulesData.currentSpaceID)

    // return

    const orphanBranchData = await syncOrphanBranch({ ...bbModulesData, bbModulesPath })
  } catch (error) {
    console.log(chalk.red(error.message))
  }
}

module.exports = tempSync

/**
 * archiver package eg, for zipping
 */
// https://stackoverflow.com/questions/65960979/node-js-archiver-need-syntax-for-excluding-file-types-via-glob
// const fs = require('fs');
// const archiver = require('archiver');
// const output = fs.createWriteStream(__dirname);
// const archive = archiver('zip', { zlib: { level: 9 } });
// archive.pipe(output);
// archive.glob('*/**', {
//    cwd: __dirname,
//    ignore: ['**/node_modules/*', '.git', '*.zip']
// });
// archive.finalize();
