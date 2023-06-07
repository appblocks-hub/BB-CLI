/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const path = require('path')

const { rmdirSync, mkdirSync, existsSync } = require('fs')
const { GitManager } = require('../../../utils/gitManagerV2')
const { getGitConfigNameEmailFromConfigStore } = require('../../../utils/questionPrompts')
const { checkAndSetGitConfigNameEmail } = require('../../../utils/gitCheckUtils')
const { buildBlockConfig, searchFile, addBlockWorkSpaceCommits, getAndSetSpace } = require('./util')
const ConfigFactory = require('../../../utils/configManagers/configFactory')
const { headLessConfigStore, configstore } = require('../../../configstore')

const createBBModules = async (options) => {
  const { bbModulesPath, rootConfig, bbModulesExists, defaultBranch } = options

  const apiPayload = {}
  const blockMetaDataMap = {}
  const blockNameArray = []

  const workspaceDirectoryPath = path.join(bbModulesPath, 'workspace')
  let repoUrl = rootConfig.source.https
  if (configstore.get('prefersSsh')) {
    repoUrl = rootConfig.source.ssh
  }

  const Git = new GitManager(workspaceDirectoryPath, repoUrl)
  if (!bbModulesExists) {
    try {
      if (!existsSync(bbModulesPath)) mkdirSync(bbModulesPath)

      if (!existsSync(workspaceDirectoryPath)) mkdirSync(workspaceDirectoryPath)

      await Git.clone('.')

      const { gitUserName, gitUserEmail } = await getGitConfigNameEmailFromConfigStore(true, headLessConfigStore)

      await checkAndSetGitConfigNameEmail(workspaceDirectoryPath, { gitUserEmail, gitUserName })

      // await Git.addRemote(workSpaceRemoteName, Git.remote)
    } catch (err) {
      rmdirSync(bbModulesPath, { recursive: true, force: true })
      throw err
    }
  }

  const currentBranch = (await Git.currentBranch())?.out

  if (currentBranch !== defaultBranch) {
    await Git.checkoutBranch(defaultBranch)
  }

  // set the appropriate space for the repository
  const currentSpaceID = await getAndSetSpace(headLessConfigStore)

  await Git.pull()

  // building initial package config manager inside bb_modules/workspace directory
  const { filePath: workSpaceConfigPath, directory: workSpaceConfigDirectoryPath } = searchFile(
    workspaceDirectoryPath,
    'block.config.json'
  )

  const { manager: workSpaceConfigManager } = await ConfigFactory.create(workSpaceConfigPath)

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

  return {
    blockMetaDataMap,
    workspaceDirectoryPath: workSpaceConfigDirectoryPath,
    repoUrl,
    blockNameArray,
    apiPayload,
    currentSpaceID,
  }
}

module.exports = createBBModules
