/* eslint-disable prefer-const */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { existsSync, rmSync, readdirSync, statSync } = require('fs')
const { readInput } = require('../../../utils/questionPrompts')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const path = require('path')

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
    directory:workSpaceConfigManager.directory
  }



  for await (const blockManager of workSpaceConfigManager.getDependencies()) {

    if (!blockManager?.config) continue

    const currentConfig = {
      ...blockManager.config,
      workSpaceCommitID: latestWorkSpaceCommitHash,
      isPublic: repoVisibility === 'PUBLIC' ? true : false,
      directory:blockManager.directory
    }
    currentPackageDependencies.push(currentConfig)
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

const getLatestCommits=async (branchName,n,Git)=>{
   let latestWorkSpaceCommit = await Git.getCommits(branchName,n)
    let commits = latestWorkSpaceCommit?.out?.trim()?.split('\n') ?? []

    return commits
}


const searchFile=(directory, filename)=>{
  const files = readdirSync(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const fileStat = statSync(filePath);

    if (fileStat.isDirectory()) {
      const foundPath = searchFile(filePath, filename);
      if (foundPath) {
        return foundPath;
      }
    } else if (file === filename) {
      return filePath;
    }
  }

  return null;
}

module.exports = { buildBlockConfig, removeSync,searchFile,getLatestCommits}
