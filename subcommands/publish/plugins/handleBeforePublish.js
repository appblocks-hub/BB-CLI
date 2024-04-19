/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { execSync } = require('child_process')
const { getBBFolderPath, BB_FOLDERS } = require('../../../utils/bbFolders')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const ContainerizedPackageConfigManager = require('../../../utils/configManagers/containerizedPackageConfigManager')
const { getBlockVersions, createZip } = require('../utils')
const GitConfigFactory = require('../../../utils/gitManagers/gitConfigFactory')
const BlockConfigManager = require('../../../utils/configManagers/blockConfigManager')

/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

class HandleBeforePublish {
  /**
   *
   * @param {PublishCore} core
   */
  apply(publishCore) {
    publishCore.hooks.beforePublish.tapPromise('HandleBeforePublish', async (core) => {
      const { manager, cmdArgs, cmdOpts } = core
      const [bkName] = cmdArgs
      const { preview, version } = cmdOpts
      const blockName = bkName || manager.config.name

      let rootManager
      let orphanBranchFolder
      let packageManager
      let blockManager
      let directory

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

        if (preview) {
          directory = path.join(bbModulesPath, 'workspace')
        } else {
          directory = orphanBranchFolder
        }

        let bManger
        if (blockName === rootManager.config.name) {
          bManger = rootManager
        } else {
          bManger = await rootManager.getAnyBlock(blockName)
          if (!bManger) throw new Error(`${blockName} block not found`)
        }

        bManger.config.orphanBranchFolder = orphanBranchFolder

        if (bManger instanceof PackageConfigManager || bManger instanceof ContainerizedPackageConfigManager) {
          packageManager = bManger
        } else blockManager = bManger

        core.versionData = await getBlockVersions(bManger.config.blockId, version)
        const checkOutVersion = `block_${blockName}@${core.versionData.version_number}`
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
          core.zipFile = await createZip({
            blockName,
            rootDir: rootManager.directory,
            directory,
            version: core.versionData.version_number,
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
        core.versionData = await getBlockVersions(bId, version)
      } else throw new Error(`Please check repoType is mono or multi`)

      // Publish package block
      if (packageManager) core.manager = packageManager
      // Publish single block
      else if (blockManager) core.manager = blockManager
      else throw new Error('Error getting block manager')
    })
  }
}

module.exports = HandleBeforePublish
