/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const path = require('path')
const { spinnies } = require('../../../loader')

const { rmdirSync, fstat, mkdirSync, existsSync } = require('fs')
const { GitManager } = require('../../../utils/gitManagerV2')
const { getGitConfigNameEmail } = require('../../../utils/questionPrompts')
const { checkAndSetGitConfigNameEmail } = require('../../../utils/gitCheckUtils')
const { buildBlockConfig, searchFile, getLatestCommits } = require('./util')
const ConfigFactory = require('../../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const { get } = require('http')

const createBBModules = async (options) => {
  try {
    const { bbModulesPath, rootConfig, bbModulesExists, defaultBranch } = options

    let blockMetaDataMap = {}
    let workspaceDirectoryPath = path.join(bbModulesPath, 'workspace')
    let repoUrl = rootConfig.source.https

    const Git = new GitManager(workspaceDirectoryPath,repoUrl)

    if (!bbModulesExists) {
      try {
        if (!existsSync(bbModulesPath)) mkdirSync(bbModulesPath)

        if (!existsSync(workspaceDirectoryPath)) mkdirSync(workspaceDirectoryPath)

        await Git.init()

        const { gitUserName, gitUserEmail } = await getGitConfigNameEmail()
        await checkAndSetGitConfigNameEmail(workspaceDirectoryPath, { gitUserEmail, gitUserName })
        console.log(`Git local config updated with ${gitUserName} & ${gitUserEmail}`)

        await Git.addRemote('origin', repoUrl)

        await Git.fetch()

        await Git.checkoutBranch(defaultBranch)
      } catch (err) {
        rmdirSync(bbModulesPath, { recursive: true, force: true })
        throw err
      }
    }

    let currentBranch = (await Git.currentBranch())?.out

    if (currentBranch !== defaultBranch) {
      await Git.checkoutBranch(defaultBranch)
    }

    await Git.pullBranch(defaultBranch)

   const commits=await getLatestCommits(defaultBranch,1,Git)

    if (commits.length === 0) {
      throw new Error(`No commits found for the default branch ${defaultBranch}`)
    }

    const [latestWorkSpaceCommitHash, latestworkSpaceCommitMessage] = commits[0].split(' ', 2)

    // building initial package config manager inside bb_modules/workspace directory
    const workSpaceConfigPath=searchFile(workspaceDirectoryPath,'block.config.json')

    // console.log("workSpaceConfigPath is \n",workSpaceConfigPath)


    let configFactory = await ConfigFactory.create(workSpaceConfigPath)

    let { manager: workSpaceConfigManager } = configFactory

    await buildBlockConfig({ workSpaceConfigManager, blockMetaDataMap, latestWorkSpaceCommitHash })

    // Object.keys(blockMetaDataMap).forEach((item) => {
    //   if (blockMetaDataMap[item].type === 'package') {
    //     console.log('block metadata map item for package block is', blockMetaDataMap[item].dependencies.length)
    //   }
    // })

    return {
      latestWorkSpaceCommitHash,
      latestworkSpaceCommitMessage,
      blockMetaDataMap,
      workspaceDirectoryPath,
      repoUrl
    }
  } catch (error) {
    spinnies.add(`ups3`)
    spinnies.fail(`ups3`, { text: `Error: ${error.message || error}` })
    spinnies.stopAll()

    console.log(error)
  }
}

module.exports = createBBModules
