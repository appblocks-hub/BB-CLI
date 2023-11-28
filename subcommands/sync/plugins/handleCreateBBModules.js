/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const path = require('path')
const chalk = require('chalk')
const { mkdirSync, existsSync, rmSync } = require('fs')
const { BB_FILES } = require('../../../utils/bbFolders')
const GitConfigFactory = require('../../../utils/gitManagers/gitConfigFactory')
const { headLessConfigStore, configstore } = require('../../../configstore')
const { getGitConfigNameEmailFromConfigStore } = require('../../../utils/questionPrompts')
const { checkAndSetGitConfigNameEmail } = require('../../../utils/gitCheckUtils')
const {
  getAndSetSpace,
  searchFile,
  buildApiPayload,
  findBlockConfig,
  buildSinglePackageBlockConfig,
  buildBlockConfig,
  addBlockWorkSpaceCommits,
} = require('../utils/createBBModuleUtil')
const ConfigFactory = require('../../../utils/configManagers/configFactory')
const { axios } = require('../../../utils/axiosInstances')
const { checkBlocksSyncedApi } = require('../../../utils/api')

class HandleCreateBBModules {
  /**
   *
   * @param {SyncCore} core
   */
  apply(syncCore) {
    syncCore.hooks.beforeSync.tapPromise('HandleCreateBBModules', async (core) => {
      const { bbModulesPath, rootConfig, bbModulesExists, defaultBranch, returnOnError, blockName, preview } =
        core.createBBModulesData

      const apiPayload = {}
      const blockMetaDataMap = {}
      const blockNameArray = []

      const workspaceDirectoryPath = path.join(bbModulesPath, BB_FILES.WORKSPACE)
      const repoUrl = rootConfig.source.ssh

      const { manager: Git, error: gErr } = await GitConfigFactory.init({
        cwd: workspaceDirectoryPath,
        gitUrl: repoUrl,
      })
      if (gErr) throw gErr

      if (!bbModulesExists) {
        try {
          if (!existsSync(bbModulesPath)) mkdirSync(bbModulesPath, { recursive: true })

          if (!existsSync(workspaceDirectoryPath)) mkdirSync(workspaceDirectoryPath, { recursive: true })

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
          if (existsSync(bbModulesPath)) {
            rmSync(bbModulesPath, { recursive: true, force: true })
          }
          throw err
        }
      }

      const currentBranch = (await Git.currentBranch())?.out?.trim()

      if (currentBranch !== defaultBranch) {
        await Git.checkoutBranch(defaultBranch)
      }

      // set the appropriate space for the repository
      const currentSpaceID = await getAndSetSpace(headLessConfigStore())

      core.spinnies.add('sync', { text: `Fetching latest ${defaultBranch} branch` })

      const pullResult = await Git.pullBranch(defaultBranch)

      // check if there are any changes in pull
      const noPullChanges = pullResult.out.includes('Already up to date')
      if (noPullChanges && returnOnError) {
        core.spinnies.remove('sync')
        core.bbModulesData = { noPullChanges }
        return
      }

      core.spinnies.update('sync', { text: 'Initialising config manager' })
      // building initial package config manager inside bb_modules/workspace directory
      const searchFileData = searchFile(workspaceDirectoryPath, 'block.config.json')
      const { filePath: workSpaceConfigPath, directory: workSpaceConfigDirectoryPath } = searchFileData || {}

      const { manager: workSpaceConfigManager, error } = await ConfigFactory.create(workSpaceConfigPath)

      if (error) throw error
      // const { manager: workSpaceConfigManager } = configFactory

      workSpaceConfigManager.newParentBlockIDs = []

      if (preview) {
        const currentConfig = workSpaceConfigManager.config

        if (!blockMetaDataMap[currentConfig.name]) {
          blockMetaDataMap[currentConfig.name] = { blockManager: workSpaceConfigManager }
          blockNameArray.push(currentConfig.name)
        }
        buildApiPayload(currentConfig, apiPayload)
      } else if (blockName) {
        const blockConfigDetails = {}
        await findBlockConfig({
          workSpaceConfigManager,
          blockMetaDataMap,
          blockNameArray,
          rootPath: workSpaceConfigDirectoryPath,
          apiPayload,
          blockName,
          blockConfigDetails,
        })

        if (Object.keys(blockConfigDetails).length === 0) {
          throw new Error('Invalid block Name')
        }

        let syncedBlockIds = null
        // check if root block is synced
        const blockIds = [workSpaceConfigManager.config.blockId]

        const checkRes = await axios.post(checkBlocksSyncedApi, { block_ids: blockIds })
        syncedBlockIds = checkRes.data?.data?.map((b) => b.id) || []

        if (!syncedBlockIds?.includes(workSpaceConfigManager.config.blockId)) {
          await buildSinglePackageBlockConfig({
            workSpaceConfigManager,
            blockMetaDataMap,
            blockNameArray,
            apiPayload,
          })
        }

        if (blockConfigDetails.configManager.config.type === 'package') {
          await buildBlockConfig({
            workSpaceConfigManager: blockConfigDetails.configManager,
            blockMetaDataMap,
            blockNameArray,
            rootPath: blockConfigDetails.configManager.directory,
            apiPayload,
          })
        }
      } else {
        await buildBlockConfig({
          workSpaceConfigManager,
          blockMetaDataMap,
          blockNameArray,
          rootPath: workSpaceConfigDirectoryPath,
          apiPayload,
        })
      }

      await addBlockWorkSpaceCommits(blockMetaDataMap, Git, workspaceDirectoryPath)

      // await checkAndPushChanges(Git, defaultBranch, workSpaceRemoteName)
      core.spinnies.succeed('sync', { text: 'Config Manager initialised' })

      core.bbModulesData = {
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
    })
  }
}

module.exports = HandleCreateBBModules
