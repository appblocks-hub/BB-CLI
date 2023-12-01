/* eslint-disable no-param-reassign */
/* eslint-disable prefer-const */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { prompt } = require('inquirer')
const { execSync } = require('child_process')
const { existsSync, rmSync, readdirSync, statSync } = require('fs')
const { readInput } = require('../../../utils/questionPrompts')
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
const { getLatestCommits } = require('./syncOrphanBranchesUtil')
const { listSpaces } = require('../../../utils/spacesUtils')
const { feedback } = require('../../../utils/cli-feedback')
const GitConfigFactory = require('../../../utils/gitManagers/gitConfigFactory')

const buildApiPayload = (currentConfig, apiPayload) => {
  if (currentConfig?.blockId && currentConfig?.type && currentConfig?.source) {
    apiPayload[currentConfig.name] = {
      id: currentConfig.blockId,
      type: currentConfig.type,
      source: currentConfig.source,
      language: currentConfig?.language ?? '',
      start: currentConfig?.start ?? '',
      build: currentConfig?.build ?? '',
      postPull: currentConfig?.postPull ?? '',
      parentBlockIDs: currentConfig?.parentBlockIDs ?? [],
      isPublic: currentConfig?.isPublic ?? false,
      description: currentConfig?.description ?? '',
      variantOf: currentConfig?.variantOf ?? '',
    }
  }
}

const buildSinglePackageBlockConfig = async (options) => {
  let { workSpaceConfigManager, blockMetaDataMap, blockNameArray, apiPayload } = options

  let currentPackageMemberBlocks = {}

  let packageMetaData = { blockManager: workSpaceConfigManager }

  let packageConfig = workSpaceConfigManager.config

  if (!(workSpaceConfigManager instanceof PackageConfigManager)) {
    throw new Error('Error parsing package block')
  }

  blockNameArray.push(packageConfig.name)

  for await (const blockManager of workSpaceConfigManager.getDependencies()) {
    if (!blockManager?.config) continue

    // copying package config parent block name for transferring to the next package block
    blockManager.newParentBlockIDs = workSpaceConfigManager.newParentBlockIDs.slice()
    blockManager.newParentBlockIDs.push(packageConfig.id)
    let currentMetaData = {
      blockManager,
    }

    let currentConfig = blockManager.config

    currentMetaData.memberBlocks = []

    if (!currentPackageMemberBlocks[currentConfig.name]) {
      currentPackageMemberBlocks[currentConfig.name] = { blockID: currentConfig.id, directory: currentConfig.directory }
    }
  }
  packageMetaData.memberBlocks = currentPackageMemberBlocks

  buildApiPayload(workSpaceConfigManager.config, apiPayload)

  // building metadata map for general purposes
  if (!blockMetaDataMap[packageConfig.name]) {
    blockMetaDataMap[packageConfig.name] = packageMetaData
  }
}

// eslint-disable-next-line consistent-return
const findBlockConfig = async (options) => {
  let {
    workSpaceConfigManager,
    blockMetaDataMap,
    blockNameArray,
    rootPath,
    apiPayload,
    blockName,
    blockConfigDetails,
  } = options

  let packageConfig = workSpaceConfigManager.config

  if (!(workSpaceConfigManager instanceof PackageConfigManager)) {
    throw new Error('Error parsing package block')
  }

  if (packageConfig.name === blockName) {
    blockConfigDetails.configManager = workSpaceConfigManager
    return
  }

  for await (const blockManager of workSpaceConfigManager.getDependencies()) {
    if (!blockManager?.config) continue

    // copying package config parent block name for transferring to the next package block
    blockManager.newParentBlockIDs = workSpaceConfigManager.newParentBlockIDs.slice()
    blockManager.newParentBlockIDs.push(packageConfig.id)
    let currentMetaData = {
      blockManager,
    }

    let currentConfig = blockManager.config

    currentMetaData.memberBlocks = []

    if (currentConfig.type === 'package') {
      await findBlockConfig({
        workSpaceConfigManager: blockManager,
        blockMetaDataMap,
        blockNameArray,
        rootPath,
        apiPayload,
        blockName,
        blockConfigDetails,
      })
    } else if (currentConfig.name === blockName) {
      if (!blockMetaDataMap[currentConfig.name]) {
        blockMetaDataMap[currentConfig.name] = currentMetaData
        blockNameArray.push(currentConfig.name)
      }

      buildApiPayload(blockManager.config, apiPayload)
      blockConfigDetails.configManager = blockManager
      return
    }
  }
}

const buildBlockConfig = async (options) => {
  let { workSpaceConfigManager, blockMetaDataMap, blockNameArray, rootPath, apiPayload } = options

  let currentPackageMemberBlocks = {}

  let packageMetaData = { blockManager: workSpaceConfigManager }

  let packageConfig = workSpaceConfigManager.config

  if (!(workSpaceConfigManager instanceof PackageConfigManager)) {
    throw new Error('Error parsing package block')
  }

  blockNameArray.push(packageConfig.name)

  for await (const blockManager of workSpaceConfigManager.getDependencies()) {
    if (!blockManager?.config) continue

    // copying package config parent block name for transferring to the next package block
    blockManager.newParentBlockIDs = workSpaceConfigManager.newParentBlockIDs.slice()
    blockManager.newParentBlockIDs.push(packageConfig.id)
    let currentMetaData = {
      blockManager,
    }

    let currentConfig = blockManager.config

    currentMetaData.memberBlocks = []

    if (!currentPackageMemberBlocks[currentConfig.name]) {
      currentPackageMemberBlocks[currentConfig.name] = { blockID: currentConfig.id, directory: currentConfig.directory }
    }

    if (currentConfig.type === 'package') {
      await buildBlockConfig({
        workSpaceConfigManager: blockManager,
        blockMetaDataMap,
        blockNameArray,
        rootPath,
        apiPayload,
      })
    } else {
      if (!blockMetaDataMap[currentConfig.name]) {
        blockMetaDataMap[currentConfig.name] = currentMetaData
        blockNameArray.push(currentConfig.name)
      }

      buildApiPayload(blockManager.config, apiPayload)
    }
  }
  packageMetaData.memberBlocks = currentPackageMemberBlocks

  buildApiPayload(workSpaceConfigManager.config, apiPayload)

  // building metadata map for general purposes
  if (!blockMetaDataMap[packageConfig.name]) {
    blockMetaDataMap[packageConfig.name] = packageMetaData
  }
}

const addBlockWorkSpaceCommits = async (blockMetaDataMap, Git) => {
  const blocksArray = Object.keys(blockMetaDataMap)
  for (const item of blocksArray) {
    let block = blockMetaDataMap[item]
    let blockWorksSpaceDirectory = block.blockManager.directory

    const workSpaceCommits = await getLatestCommits(blockWorksSpaceDirectory, 1, Git)

    const latestWorkSpaceCommitHash = workSpaceCommits[0].split(' ')[0]

    block.workSpaceCommitID = latestWorkSpaceCommitHash

    blockMetaDataMap[item] = block
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

const searchFile = (directory, filename) => {
  const files = readdirSync(directory)

  if (files.includes(filename)) {
    return { filePath: path.join(directory, filename), directory }
  }

  for (const file of files) {
    const filePath = path.join(directory, file)
    const fileStat = statSync(filePath)

    if (fileStat.isDirectory()) {
      const foundPath = searchFile(filePath, filename)
      if (foundPath) {
        return foundPath
      }
    }
  }

  return null
}

const promptAndSetSpace = async (Data, configstore) => {
  const question = [
    {
      type: 'list',
      message: 'Choose a space to continue',
      choices: Data.map((v) => ({ name: v.space_name, value: { id: v.space_id, name: v.space_name } })),
      name: 'spaceSelect',
    },
  ]
  const {
    spaceSelect: { name, id },
  } = await prompt(question)

  configstore.set('currentSpaceName', name)
  configstore.set('currentSpaceId', id)

  feedback({ type: 'success', message: `${name} set` })
}

const getAndSetSpace = async (configstore) => {
  const currentSpaceId = configstore.get('currentSpaceId')
  // console.log('currentSpaceId', currentSpaceId);
  if (currentSpaceId) return currentSpaceId
  const res = await listSpaces()
  // console.log('res', res.data);
  if (res.data.err) {
    throw new Error('Unable to get space details')
  }
  const Data = res.data.data

  /**
   * @type {import('../utils/jsDoc/types').spaceDetails}
   */
  await promptAndSetSpace(Data, configstore)
  return configstore.get('currentSpaceId')
}

const setVisibilityAndDefaultBranch = async (options) => {
  const { repoUrl, headLessConfigStore, cwd } = options

  let defaultBranch = headLessConfigStore.get('defaultBranch')
  // let repoVisibility = headLessConfigStore().get('repoVisibility')

  if (!defaultBranch) {
    const { manager, error } = await GitConfigFactory.init({ gitUrl: repoUrl })
    if (error) throw error
    const repository = await manager.getRepository()
    defaultBranch = repository?.defaultBranchName ?? ''

    const inputRepoMainBranch = await readInput({
      name: 'inputRepoMainBranch',
      message: 'Enter the default branch name for the repository',
      validate: (input) => {
        if (!input?.length > 0) return `Please enter a non empty branch name`
        return true
      },
      default: defaultBranch,
    })

    defaultBranch = inputRepoMainBranch

    headLessConfigStore.set('defaultBranch', defaultBranch)
  }
  //  check origin exist
  const cmdCheckMain = `git ls-remote --heads --quiet origin ${defaultBranch}`
  const existBranch = execSync(cmdCheckMain, { cwd }).toString().trim() !== ''
  if (!existBranch) throw new Error(`Remote ${defaultBranch} branch not found! Please run bb push and try again`)

  return { defaultBranch }
}

const calculateDirectoryDifference = (path1, path2) => {
  const relativePath = path.relative(path1, path2)
  return relativePath.replace(/\\/g, '/') // Normalize path separators
}

module.exports = {
  buildBlockConfig,
  removeSync,
  searchFile,
  addBlockWorkSpaceCommits,
  getAndSetSpace,
  calculateDirectoryDifference,
  setVisibilityAndDefaultBranch,
  // checkAndPushChanges,
  findBlockConfig,
  buildSinglePackageBlockConfig,
  buildApiPayload
}
