/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { execSync } = require('child_process')
const chalk = require('chalk')
const { spinnies } = require('../../loader')
const createBlockVersion = require('./createBlockVersion')
const { createPackageVersion } = require('./createPackageVersion')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const tempSync = require('../tempSync')
const { confirmationPrompt } = require('../../utils/questionPrompts')
const { isCleanBlock } = require('../../utils/gitCheckUtils')
const { BB_CONFIG_NAME } = require('../../utils/constants')

const createVersion = async (bkName, cmdOptions) => {
  try {
    const configPath = path.resolve(BB_CONFIG_NAME)
    const { manager: cm, error } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      throw new Error('Please run the command inside package context ')
    }
    let manager = cm

    const curBranch = execSync(`git branch --show-current`, { cwd: manager.directory }).toString().trim()
    const blockName = bkName || manager.config.name

    let rootManager
    let orphanBranchFolder
    let workSpaceFolder
    let packageManager
    let blockManager

    if (manager.config.repoType === 'mono') {
      const { err, rootManager: rm } = await manager.findMyParents()
      if (err) throw err
      rootManager = rm

      orphanBranchFolder = path.join(rootManager.directory, 'bb_modules', `block_${blockName}`)
      workSpaceFolder = path.join(rootManager.directory, 'bb_modules', 'workspace')

      const isCleanBlockName = manager.isPackageConfigManager && !bkName ? null : blockName
      isCleanBlock(manager.directory, isCleanBlockName)
      isCleanBlock(orphanBranchFolder)
      isCleanBlock(workSpaceFolder, isCleanBlockName && `block_${isCleanBlockName}`)

      // sync
      spinnies.add('sync', { text: 'Checking sync status' })
      await tempSync(null, { returnOnError: true })
      spinnies.succeed('sync', { text: 'sync is up to date' })

      const execOptions = { cwd: manager.directory }

      let aheadChanges = false
      const existBranch =
        execSync(`git ls-remote --exit-code --heads origin ${curBranch}`, execOptions).toString().trim() !== ''
      if (existBranch) {
        const changesExist = execSync(`git log origin/main..origin/${curBranch}`, execOptions).toString().trim() !== ''
        if (changesExist) aheadChanges = true
      } else aheadChanges = true

      if (aheadChanges) {
        console.log(chalk.dim('Create version code will be considered from main branch only'))
        if (!cmdOptions?.force) {
          const goAhead = await confirmationPrompt({
            name: 'goAhead',
            message: 'Your current branch changes are not synced to main. Do you want to continue?',
          })

          if (!goAhead) return
        }
      }

      const { manager: wcm, error: wErr } = await ConfigFactory.create(path.join(workSpaceFolder, BB_CONFIG_NAME))
      if (wErr) {
        if (wErr.type !== 'OUT_OF_CONTEXT') throw wErr
        throw new Error('Please run the command inside package context ')
      }
      manager = wcm

      manager.config.workSpaceFolder = workSpaceFolder
      manager.config.orphanBranchFolder = orphanBranchFolder

      // called from package context

      if (!blockName || blockName === manager.config.blockName) {
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

        if (blockName && blockName !== manager.config.blockName) {
          throw new Error('Cannot pass block name inside block context')
        }
        blockManager = manager
      } else if (manager instanceof PackageConfigManager) {
        // called from package context

        if (!blockName || blockName === manager.config.blockName) {
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

    if (blockManager) {
      await createBlockVersion({ blockManager, cmdOptions })
    } else if (packageManager) {
      await createPackageVersion({ packageManager, cmdOptions })
    }
  } catch (err) {
    console.log({ err })
    spinnies.add('cv', { text: 'Error' })
    spinnies.fail('cv', { text: `${err.message} ${err.path ? `(${err.path})` : ''} ` })
    spinnies.stopAll()
  }
}

module.exports = createVersion
