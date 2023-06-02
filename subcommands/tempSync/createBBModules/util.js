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
const { getLatestCommits } = require('../syncOrphanBranches/util')
const chalk = require('chalk')
const { listSpaces } = require('../../../utils/spacesUtils')
const { feedback } = require('../../../utils/cli-feedback')
const { prompt } = require('inquirer')
const { axios } = require('../../../utils/axiosInstances')
const { githubGraphQl } = require('../../../utils/api')
const { isInRepo } = require('../../../utils/Queries')
const { getGitHeader } = require('../../../utils/getHeaders')

const buildBlockConfig = async (options) => {
  let { workSpaceConfigManager, blockMetaDataMap, repoVisibility, blockNameArray, rootPath, createApiPayload } = options

  let currentPackageMemberBlocks = {}

  const packageConfig = { blockManager: workSpaceConfigManager}

  if (!workSpaceConfigManager instanceof PackageConfigManager) {
    throw new Error('Error parsing package block')
  }

  let metaData = {
    ...workSpaceConfigManager.config,
    isPublic: repoVisibility === 'PUBLIC' ? true : false,
    directory: calculateDirectoryDifference(rootPath, workSpaceConfigManager.directory),
  }

  blockNameArray.push(metaData.name)

  //removing dependencies deprecated later
  if (metaData.hasOwnProperty('dependencies')) {
    delete metaData['dependencies']
  }

  for await (const blockManager of workSpaceConfigManager.getDependencies()) {
    if (!blockManager?.config) continue

    //copying package config parent block name for transferring to the next package block
    blockManager.config.parentBlockNames = metaData.parentBlockNames.slice()
    blockManager.config.parentBlockNames.push(metaData.name)
    let currentConfig = {
      blockManager: blockManager,
    }

    const currentMeta = {
      ...blockManager.config,
      isPublic: repoVisibility === 'PUBLIC' ? true : false,
      directory: calculateDirectoryDifference(rootPath, blockManager.directory),
      memberBlocks: [],
    }

    if (!currentPackageMemberBlocks[currentMeta.name]) {
      currentPackageMemberBlocks[currentMeta.name] = { blockID: '',directory:currentMeta.directory }
    }

    currentConfig.metaData = currentMeta

    if (currentMeta.type === 'package') {
      await buildBlockConfig({
        workSpaceConfigManager: blockManager,
        blockMetaDataMap,
        repoVisibility,
        blockNameArray,
        rootPath,
        createApiPayload,
      })
    } else {
      if (!blockMetaDataMap[currentMeta.name]) {
        blockMetaDataMap[currentMeta.name] = currentConfig
        blockNameArray.push(currentMeta.name)
        if (!currentMeta?.blockID) {
          //removing dependencies deprecated later
          if (currentMeta.hasOwnProperty('dependencies')) {
            delete currentMeta['dependencies']
          }
          createApiPayload[currentMeta.name] = { ...currentMeta }
        }
      }
    }
  }
  metaData.memberBlocks = currentPackageMemberBlocks

  if (!metaData?.blockID) {
    createApiPayload[metaData.name] = { ...metaData }
  }

  packageConfig.metaData = metaData

  //building metadata map for general purposes
  if (!blockMetaDataMap[metaData.name]) {
    blockMetaDataMap[metaData.name] = packageConfig
  }
}

const addBlockWorkSpaceCommits = async (blockMetaDataMap, Git, createApiPayload) => {
  const blocksArray = Object.keys(blockMetaDataMap)
  for (const item of blocksArray) {
    let metaData = blockMetaDataMap[item].metaData
    let blockWorksSpaceDirectory=blockMetaDataMap[item].blockManager.directory



    const workSpaceCommits = await getLatestCommits(blockWorksSpaceDirectory, 1, Git)

    const latestWorkSpaceCommitHash = workSpaceCommits[0].split(' ')[0]

    metaData.workSpaceCommitID = latestWorkSpaceCommitHash

    blockMetaDataMap[item].metaData = metaData
    createApiPayload[item].workSpaceCommitID = latestWorkSpaceCommitHash
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

  for (const file of files) {
    const filePath = path.join(directory, file)
    const fileStat = statSync(filePath)

    if (fileStat.isDirectory()) {
      const foundPath = searchFile(filePath, filename)
      if (foundPath) {
        return foundPath
      }
    } else if (file === filename) {
      return {filePath,directory}
    }
  }

  return null
}

const getAndSetSpace = async (configstore) => {
  const currentSpaceId = configstore.get('currentSpaceId')

  if (currentSpaceId) {
    return currentSpaceId
  } else {
    const res = await listSpaces()
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

const setVisibilityAndDefaultBranch = async (options) => {
  const { configstore, repoUrl, headLessConfigStore } = options

  const defaultBranch = headLessConfigStore.get('defaultBranch')
  const repoVisibility = headLessConfigStore.get('repoVisibility')

  if (defaultBranch && repoVisibility) {
    return { defaultBranch, repoVisibility }
  } else {
    const githubUserName = configstore.get('githubUserName')
    const repoHttpsUrl = repoUrl.replace('.git', '').split('/')
    const repoName = repoHttpsUrl[repoHttpsUrl.length - 1]
    const orgName = repoHttpsUrl[repoHttpsUrl.length - 2]
    let defaultBranch
    let repoVisibility

    const axiosExistingRepoData = await axios.post(
      githubGraphQl,
      {
        query: isInRepo.Q,
        variables: {
          user: githubUserName,
          reponame: repoName,
          orgname: orgName,
        },
      },
      { headers: getGitHeader() }
    )

    const existingRepoData = await isInRepo.Tr(axiosExistingRepoData)

    defaultBranch = existingRepoData?.defaultBranchName ?? ''
    repoVisibility = existingRepoData?.visibility ?? ''

    if (repoVisibility.length === 0) {
      // console.log("Error getting Repository visibility and main branch from git\n")

      const inputRepoVisibility = await readInput({
        name: 'inputRepoVisibility',
        type: 'checkbox',
        message: 'Select the repo visibility',
        choices: ['PUBLIC', 'PRIVATE'].map((visibility) => visibility),
        validate: (input) => {
          if (!input || input?.length < 1) return `Please enter either public or private`
          return true
        },
      })

      repoVisibility = inputRepoVisibility
    }

    headLessConfigStore.set('repoVisibility', repoVisibility)

    if (defaultBranch.length === 0) {
      console.log('entered repo main branch unavailable\n')
      const inputRepoMainBranch = await readInput({
        name: 'inputRepoMainBranch',
        message: 'Enter the default branch name for the repository',
        validate: (input) => {
          if (!input?.length > 0) return `Please enter a non empty branch name`
          return true
        },
      })

      defaultBranch = inputRepoMainBranch
    }

    headLessConfigStore.set('defaultBranch', defaultBranch)

    return { defaultBranch, repoVisibility }
  }
}

function calculateDirectoryDifference(path1, path2) {
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
}
