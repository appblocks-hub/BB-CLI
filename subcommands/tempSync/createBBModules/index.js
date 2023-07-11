/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const path = require('path')
const chalk = require('chalk')

const { rmdirSync, mkdirSync, existsSync } = require('fs')
const { GitManager } = require('../../../utils/gitManagerV2')
const { getGitConfigNameEmailFromConfigStore } = require('../../../utils/questionPrompts')
const { checkAndSetGitConfigNameEmail } = require('../../../utils/gitCheckUtils')
const { buildBlockConfig, searchFile, addBlockWorkSpaceCommits, getAndSetSpace } = require('./util')
const ConfigFactory = require('../../../utils/configManagers/configFactory')
const { headLessConfigStore, configstore } = require('../../../configstore')
const { spinnies } = require('../../../loader')
const { BB_FILES } = require('../../../utils/bbFolders')

const createBBModules = async (options) => {
  try {
    const { bbModulesPath, rootConfig, bbModulesExists, defaultBranch, returnOnError } = options

    const apiPayload = {}
    const blockMetaDataMap = {}
    const blockNameArray = []

    const workspaceDirectoryPath = path.join(bbModulesPath, BB_FILES.WORKSPACE)
    const repoUrl = rootConfig.source.ssh

    const Git = new GitManager(workspaceDirectoryPath, repoUrl)
    if (!bbModulesExists) {
      try {
        if (!existsSync(bbModulesPath)) mkdirSync(bbModulesPath)

        if (!existsSync(workspaceDirectoryPath)) mkdirSync(workspaceDirectoryPath)

        await Git.clone('.')

        let gitUserName = headLessConfigStore().get('localGitName', '')
        let gitUserEmail = headLessConfigStore().get('localGitEmail', '')

        if (!gitUserName || !gitUserEmail) {
          console.log(chalk.dim(`Please enter git username and email`))
          const gitUser = await getGitConfigNameEmailFromConfigStore(false, configstore)
          
          gitUserName = gitUser.gitUserName
          gitUserEmail = gitUser.gitUserEmail

          headLessConfigStore().set('localGitName', gitUserName)
          headLessConfigStore().set('localGitEmail', gitUserEmail)
        }

        await checkAndSetGitConfigNameEmail(workspaceDirectoryPath, { gitUserEmail, gitUserName })

        // await Git.addRemote(workSpaceRemoteName, Git.remote)
      } catch (err) {
        rmdirSync(bbModulesPath, { recursive: true, force: true })
        throw err
      }
    }

    const currentBranch = (await Git.currentBranch())?.out?.trim()

    if (currentBranch !== defaultBranch) {
      await Git.checkoutBranch(defaultBranch)
    }

    // set the appropriate space for the repository
    const currentSpaceID = await getAndSetSpace(headLessConfigStore())

    spinnies.add('Config Manager', { text: 'Initialising config manager' })

    const pullResult = await Git.pullBranch(defaultBranch)

    // check if there are any changes in pull
    const noPullChanges = pullResult.out.includes('Already up to date')
    if (noPullChanges && returnOnError) {
      spinnies.remove('Config Manager')
      return { noPullChanges }
    }

    // building initial package config manager inside bb_modules/workspace directory
    const searchFileData = searchFile(workspaceDirectoryPath, 'block.config.json')
    const { filePath: workSpaceConfigPath, directory: workSpaceConfigDirectoryPath } = searchFileData || {}

    const { manager: workSpaceConfigManager, error } = await ConfigFactory.create(workSpaceConfigPath)

    if (error) throw error
    // const { manager: workSpaceConfigManager } = configFactory

    workSpaceConfigManager.newParentBlockIDs = []

    await buildBlockConfig({
      workSpaceConfigManager,
      blockMetaDataMap,
      blockNameArray,
      rootPath: workSpaceConfigDirectoryPath,
      apiPayload,
    })

    await addBlockWorkSpaceCommits(blockMetaDataMap, Git, workspaceDirectoryPath)

    // await checkAndPushChanges(Git, defaultBranch, workSpaceRemoteName)
    spinnies.succeed('Config Manager', { text: 'Config Manager initialised' })

    return {
      blockMetaDataMap,
      workspaceDirectoryPath: workSpaceConfigDirectoryPath,
      repoUrl,
      blockNameArray,
      apiPayload,
      currentSpaceID,
      rootPackageBlockID: workSpaceConfigManager.config.blockId,
      rootPackageName: workSpaceConfigManager.config.name,
      noPullChanges,
    }
  } catch (err) {
    spinnies.add('Config Manager')
    spinnies.fail('Config Manager', { text: err.toString() })
    throw err
  }
}

module.exports = createBBModules
