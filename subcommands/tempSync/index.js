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
const { existsSync } = require('fs')
const { isInRepo } = require('../../utils/Queries')
const { configstore } = require('../../configstore')
const { default: axios } = require('axios')
const { githubGraphQl } = require('../../utils/api')
const { getGitHeader } = require('../../utils/getHeaders')
const syncOrphanBranch = require('./syncOrphanBranches')

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

    const bbModulesExists = existsSync(bbModulesPath)

    const githubUserName = configstore.get('githubUserName')
    const repoHttpsUrl = repoUrl.replace('.git', '').split('/')
    const repoName = repoHttpsUrl[repoHttpsUrl.length - 1]
    const orgName = repoHttpsUrl[repoHttpsUrl.length - 2]
    let defaultBranch
    let repoVisibility

    const axiosExistingRepoData = await axios.post(
      githubGraphQl,
      {
        query: isInRepo.Q,
        variables: {
          user: githubUserName,
          reponame: repoName,
          orgname: orgName,
        },
      },
      { headers: getGitHeader() }
    )

    const existingRepoData = await isInRepo.Tr(axiosExistingRepoData)

    defaultBranch = existingRepoData?.defaultBranchName ?? ''
    repoVisibility = existingRepoData?.visibility ?? ''

    if (repoVisibility.length === 0) {
      // console.log("Error getting Repository visibility and main branch from git\n")

      const inputRepoVisibility = await readInput({
        name: 'inputRepoVisibility',
        type: 'checkbox',
        message: 'Select the repo visibility',
        choices: ['PUBLIC', 'PRIVATE'].map((visibility) => visibility),
        validate: (input) => {
          if (!input || input?.length < 1) return `Please enter either public or private`
          return true
        },
      })

      repoVisibility = inputRepoVisibility
    }

    if (defaultBranch.length === 0) {
      console.log('entered repo main branch unavailable\n')
      const inputRepoMainBranch = await readInput({
        name: 'inputRepoMainBranch',
        message: 'Enter the default branch name for the repository',
        validate: (input) => {
          if (!input?.length > 0) return `Please enter a non empty branch name`
          return true
        },
      })

      defaultBranch = inputRepoMainBranch
    }

    const bbModulesData = await createBBModules({
      bbModulesPath: bbModulesPath,
      rootConfig: configManager.config,
      bbModulesExists: bbModulesExists,
      defaultBranch,
      repoVisibility,
    })

    const orphanBranchData = await syncOrphanBranch({ ...bbModulesData, bbModulesPath })

  } catch (error) {
    console.log("error inside sync is \n",error)
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
