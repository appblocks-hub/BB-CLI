/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const path = require('path')

const { rmdirSync, mkdirSync, existsSync } = require('fs')
const { GitManager } = require('../../../utils/gitManagerV2')
const { getGitConfigNameEmail } = require('../../../utils/questionPrompts')
const { checkAndSetGitConfigNameEmail } = require('../../../utils/gitCheckUtils')
const { buildBlockConfig, searchFile, addBlockWorkSpaceCommits, getAndSetSpace } = require('./util')
const ConfigFactory = require('../../../utils/configManagers/configFactory')
const { headLessConfigStore } = require('../../../configstore')

const createBBModules = async (options) => {
  const { bbModulesPath, rootConfig, bbModulesExists, defaultBranch } = options

  let blockMetaDataMap = {}
  let workspaceDirectoryPath = path.join(bbModulesPath, 'workspace')
  let repoUrl = rootConfig.source.https
  const workSpaceRemoteName = 'origin'

  const Git = new GitManager(workspaceDirectoryPath, repoUrl)

  if (!bbModulesExists) {
    try {
      if (!existsSync(bbModulesPath)) mkdirSync(bbModulesPath)

      if (!existsSync(workspaceDirectoryPath)) mkdirSync(workspaceDirectoryPath)

      await Git.init()

      const { gitUserName, gitUserEmail } = await getGitConfigNameEmail()

      await checkAndSetGitConfigNameEmail(workspaceDirectoryPath, { gitUserEmail, gitUserName })

      await Git.addRemote(workSpaceRemoteName, repoUrl)
    } catch (err) {
      rmdirSync(bbModulesPath, { recursive: true, force: true })
      throw err
    }
  }

  await Git.fetch()

  let currentBranch = (await Git.currentBranch())?.out

  if (currentBranch !== defaultBranch) {
    await Git.checkoutBranch(defaultBranch)
  }

  //set the appropriate space for the repository
  const currentSpaceID = await getAndSetSpace(headLessConfigStore)

  const pullResult = await Git.pullBranch(defaultBranch, workSpaceRemoteName)

  // building initial package config manager inside bb_modules/workspace directory
  const workSpaceConfigPath = searchFile(workspaceDirectoryPath, 'block.config.json')

  let configFactory = await ConfigFactory.create(workSpaceConfigPath)

  let { manager: workSpaceConfigManager } = configFactory

  await buildBlockConfig({ workSpaceConfigManager, blockMetaDataMap })

  await addBlockWorkSpaceCommits(blockMetaDataMap, Git)

  return {
    blockMetaDataMap,
    workspaceDirectoryPath,
    repoUrl,
  }
}

module.exports = createBBModules
