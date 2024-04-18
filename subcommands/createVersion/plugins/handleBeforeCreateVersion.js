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
const { existsSync } = require('fs')
const { execSync } = require('child_process')
const { spinnies } = require('../../../loader')
const BlockConfigManager = require('../../../utils/configManagers/blockConfigManager')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const ConfigFactory = require('../../../utils/configManagers/configFactory')
const sync = require('../../sync')
const { confirmationPrompt } = require('../../../utils/questionPrompts')
const { isCleanBlock } = require('../../../utils/gitCheckUtils')
const { BB_CONFIG_NAME } = require('../../../utils/constants')
const { headLessConfigStore } = require('../../../configstore')
const { getBBFolderPath, BB_FOLDERS, BB_FILES } = require('../../../utils/bbFolders')

class HandleBeforeCreateVersion {
  /**
   *
   * @param {CreateVersionCore} core
   */
  apply(createVersionCore) {
    createVersionCore.hooks.beforeCreateVersion.tapPromise('HandleBeforeCreateVersion', async (core) => {
      // eslint-disable-next-line prefer-const
      let { manager, cmdArgs, cmdOpts } = core
      const [component] = cmdArgs
      const { force } = cmdOpts

      const curBranch = execSync(`git branch --show-current`, { cwd: manager.directory }).toString().trim()
      const blockName = component || manager.config.name

      let rootManager
      let orphanBranchFolder
      let workSpaceFolder
      let packageManager
      let blockManager

      if (manager.config.repoType === 'mono') {
        if (manager.config.type === 'containerized') {
          rootManager = manager
        } else {
          const { err, rootManager: rm } = await manager.findMyParents()
          if (err) throw err
          rootManager = rm
        }
        const bbModulesPath = getBBFolderPath(BB_FOLDERS.BB_MODULES, rootManager.directory)
        orphanBranchFolder = path.join(bbModulesPath, `block_${blockName}`)
        workSpaceFolder = path.join(bbModulesPath, BB_FILES.WORKSPACE)

        const isCleanBlockName = manager.isPackageConfigManager && !component ? null : blockName
        isCleanBlock(manager.directory, isCleanBlockName)

        // sync
        spinnies.add('cv_sync', { text: 'Checking sync status' })
        await sync(blockName, { returnOnError: true })
        spinnies.succeed('cv_sync', { text: 'sync is up to date' })
        console.log()

        if (!existsSync(orphanBranchFolder)) {
          throw new Error(`Error reading bb modules block_${blockName}. Please run bb sync and try again`)
        }
        isCleanBlock(orphanBranchFolder)

        if (!existsSync(workSpaceFolder)) {
          throw new Error(`Error reading bb modules workspace. Please run bb sync and try again`)
        }
        isCleanBlock(workSpaceFolder, isCleanBlockName && `block_${isCleanBlockName}`)

        const execOptions = { cwd: manager.directory }
        let aheadChanges = false
        const existBranchRes = execSync(`git ls-remote --heads --quiet origin ${curBranch}`, execOptions)
        const existBranch = existBranchRes.toString().trim() !== ''
        const defaultBranch = headLessConfigStore().get('defaultBranch')

        if (!defaultBranch) {
          throw new Error(`Error getting default branch. Please run bb sync and try again`)
        }

        if (existBranch && curBranch !== defaultBranch) {
          // check changes in defaultBranch branch and current branch
          const changesExist =
            execSync(`git log origin/${defaultBranch}..origin/${curBranch}`, execOptions).toString().trim() !== ''
          if (changesExist) aheadChanges = true
        } else if (!existBranch) aheadChanges = true

        if (aheadChanges) {
          console.log(chalk.dim(`Your current branch changes are not synced to ${defaultBranch}`))
          if (force) {
            console.log(chalk.yellow(`Version will be created from ${defaultBranch} branch code`))
          } else {
            const goAhead = await confirmationPrompt({
              name: 'goAhead',
              message: `Version will be created from ${defaultBranch} branch code. Do you want to continue?`,
            })

            if (!goAhead) throw new Error('Process Cancelled!')
          }
        }

        const { manager: wcm, error: wErr } = await ConfigFactory.create(path.join(workSpaceFolder, BB_CONFIG_NAME))
        if (wErr) {
          if (wErr.type !== 'OUT_OF_CONTEXT') throw wErr
          throw new Error('Please run the command inside package context ')
        }

        // eslint-disable-next-line no-const-assign
        manager = wcm

        manager.config.workSpaceFolder = workSpaceFolder
        manager.config.orphanBranchFolder = orphanBranchFolder

        // called from package context

        if (!blockName || blockName === manager.config.name) {
          // if blockName is empty or passed blockName is of package
          packageManager = manager
        } else {
          //  if passed blockName
          const cManager = await manager.getAnyBlock(blockName)

          //  check if blockName exist
          if (!cManager) throw new Error(`${blockName} block not found!`)

          cManager.config.workSpaceFolder = workSpaceFolder
          cManager.config.orphanBranchFolder = orphanBranchFolder

          if (cManager instanceof PackageConfigManager) packageManager = cManager
          else blockManager = cManager
        }
      } else if (manager.config.repoType === 'multi') {
        if (manager instanceof BlockConfigManager) {
          // called from block context

          if (blockName && blockName !== manager.config.name) {
            throw new Error('Cannot pass block name inside block context')
          }
          blockManager = manager
        } else if (manager instanceof PackageConfigManager) {
          // called from package context

          if (!blockName || blockName === manager.config.name) {
            // if passed blockName is of package
            packageManager = manager
          } else {
            //  if passed blockName
            const cManager = await manager.getAnyBlock(blockName)

            //  check if blockName exist
            if (!cManager) throw new Error(`${blockName} block not found!`)

            if (cManager instanceof PackageConfigManager) packageManager = cManager
            else blockManager = cManager
          }
        }
      } else throw new Error(`Please check repoType is mono or multi`)

      if (blockManager) core.manager = blockManager
      else if (packageManager) core.manager = packageManager
      else throw new Error(`Error reading config manager`)
    })
  }
}

module.exports = HandleBeforeCreateVersion
