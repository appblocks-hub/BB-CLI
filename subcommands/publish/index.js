/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const open = require('open')

const path = require('path')
const { execSync } = require('child_process')
const { spinnies } = require('../../loader')
const { publishPackageBlock } = require('./publishPackageBlock')
const publishBlock = require('./publishBlock')
const { publishRedirectApi } = require('../../utils/api')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')
const { getBlockVersions, createZip } = require('./util')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')
const { getBBFolderPath, BB_FOLDERS } = require('../../utils/bbFolders')
const GitConfigFactory = require('../../utils/gitManagers/gitConfigFactory')

const publish = async (bkName, cmdOptions) => {
  const configPath = path.resolve(BB_CONFIG_NAME)
  const { manager: cm, error } = await ConfigFactory.create(configPath)
  if (error) {
    if (error.type !== 'OUT_OF_CONTEXT') throw error
    throw new Error('Please run the command inside package context ')
  }

  const manager = cm
  const blockName = bkName || manager.config.name

  let rootManager
  let orphanBranchFolder
  let packageManager
  let blockManager
  let zipFile
  let versionData
  let directory

  try {
    if (manager.config.repoType === 'mono') {
      const { err, rootManager: rm } = await manager.findMyParents()
      if (err) throw err
      rootManager = rm

      const bbModulesPath = getBBFolderPath(BB_FOLDERS.BB_MODULES, rootManager.directory)
      const preview=cmdOptions?.preview??false

      orphanBranchFolder = path.join(bbModulesPath, `block_${blockName}`)

      if(preview){
        directory=path.join(bbModulesPath,'workspace')
      }else{
        directory=orphanBranchFolder
      }


      let bManger
      if (blockName === rootManager.config.name) {
        bManger = rootManager
      } else {
        bManger = await rootManager.getAnyBlock(blockName)
        if (!bManger) throw new Error(`${blockName} block not found`)
      }

      bManger.config.orphanBranchFolder = orphanBranchFolder

      if (bManger instanceof PackageConfigManager) {
        packageManager = bManger
      } else blockManager = bManger

      versionData = await getBlockVersions(bManger.config.blockId, cmdOptions.version)
      const checkOutVersion = `block_${blockName}@${versionData.version_number}`
      const { manager: Git, error: gErr } = await GitConfigFactory.init({
        cwd: orphanBranchFolder,
        gitUrl: rootManager.config.source.ssh,
      })
      if (gErr) throw gErr

      let isCheckOut = false
      try {
        await Git.fetch('--all')
        const curBranch = execSync(`git branch --show-current`, { cwd: manager.directory }).toString().trim()
        if (curBranch !== checkOutVersion) {
          isCheckOut = true
          await Git.checkoutBranch(checkOutVersion)
        }
        zipFile = await createZip({
          blockName,
          rootDir: rootManager.directory,
          directory,
          version: versionData.version_number,
          
        })
        if (isCheckOut) await Git.undoCheckout()
      } catch (e) {
        if (isCheckOut) await Git.undoCheckout()
        if (e.type === 'CREATE_ZIP') throw e
        console.log(`Error checkout to ${checkOutVersion} in ${orphanBranchFolder}`)
        throw new Error(`Please run bb sync and try again`)
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

      const bId = packageManager?.config.blockId || blockManager?.config.blockId
      versionData = await getBlockVersions(bId, cmdOptions.version)
    } else throw new Error(`Please check repoType is mono or multi`)

    if (packageManager) {
      // Publish package block
      await publishPackageBlock({ packageManager, zipFile, versionData, cmdOptions })
    } else if (blockManager) {
      // Publish single block
      await publishBlock({ blockManager, zipFile, versionData, cmdOptions })
    } else throw new Error('Error getting block manager')

    spinnies.stopAll()
    await open(`${publishRedirectApi}`)
  } catch (err) {
    spinnies.add('p1', { text: 'Error' })
    spinnies.fail('p1', { text: err.message })
    spinnies.stopAll()
  }
}

module.exports = publish
