/* eslint-disable prefer-const */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { existsSync, rmSync } = require('fs')
const { readInput } = require('../../../utils/questionPrompts')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')

const buildBlockConfig = async (options) => {
  let { workSpaceConfigManager, blockMetaDataMap, repoVisibility, latestWorkSpaceCommitHash } = options

  // console.log("workSpaceConfigManager is\n",workSpaceConfigManager)

  if (!workSpaceConfigManager instanceof PackageConfigManager) {
    throw new Error('Error parsing package block')
  }

  let currentPackageDependencies = []

  let packageConfig = {
    ...workSpaceConfigManager.config,
    workSpaceCommitID: latestWorkSpaceCommitHash,
    isPublic: repoVisibility === 'PUBLIC' ? true : false,
  }


  for await (const blockManager of workSpaceConfigManager.getDependencies()) {

    // console.log("blockManager is\n",blockManager)
    // if (!blockManager?.config) continue

    const currentConfig = {
      ...blockManager.config,
      workSpaceCommitID: latestWorkSpaceCommitHash,
      isPublic: repoVisibility === 'PUBLIC' ? true : false,
    }
    currentPackageDependencies.push(currentConfig)

    console.log(`currentConfig name ${currentConfig.name},type ${currentConfig.type} and root ${packageConfig.name}\n`)

    if (currentConfig.type === 'package') {
      await buildBlockConfig({
        workSpaceConfigManager:blockManager,
        blockMetaDataMap,repoVisibility,latestWorkSpaceCommitHash
      })
    } else {
      if (!blockMetaDataMap[currentConfig.name]) {
        blockMetaDataMap[currentConfig.name] = currentConfig
      }
    }
  }
  packageConfig.dependencies = currentPackageDependencies

  if (!blockMetaDataMap[packageConfig.name]) {
    blockMetaDataMap[packageConfig.name] = packageConfig
  }


}

const removeSync = async (paths) => {
  if (!paths?.length) return
  await Promise.all(
    paths.map((p) => {
      if (p && existsSync(p)) rmSync(p, { recursive: true, force: true })
      return true
    })
  )
}

module.exports = { buildBlockConfig, removeSync }
