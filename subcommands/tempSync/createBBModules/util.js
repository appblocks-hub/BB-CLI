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

const buildBlockConfig = async (options) => {
  let { workSpaceConfigManager, blockMetaDataMap, repoVisibility } = options

  if (!workSpaceConfigManager instanceof PackageConfigManager) {
    throw new Error('Error parsing package block')
  }

  let currentPackageDependencies = []

  let packageConfig = {
    ...workSpaceConfigManager.config,
    isPublic: repoVisibility === 'PUBLIC' ? true : false,
    directory: workSpaceConfigManager.directory,
  }

  for await (const blockManager of workSpaceConfigManager.getDependencies()) {
    if (!blockManager?.config) continue

    const currentConfig = {
      ...blockManager.config,
      isPublic: repoVisibility === 'PUBLIC' ? true : false,
      directory: blockManager.directory,
    }
    currentPackageDependencies.push(currentConfig)
    if (currentConfig.type === 'package') {
      await buildBlockConfig({
        workSpaceConfigManager: blockManager,
        blockMetaDataMap,
        repoVisibility,
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

const addBlockWorkSpaceCommits = async (blockMetaDataMap, Git) => {
  const blocksArray = Object.keys(blockMetaDataMap)
  for (const item of blocksArray) {
    let block = blockMetaDataMap[item]

    const workSpaceCommits = await getLatestCommits(block.directory, 1, Git)

    const latestWorkSpaceCommitHash = workSpaceCommits[0].split(' ')[0]

    blockMetaDataMap[item] = { ...block, workSpaceCommitID: latestWorkSpaceCommitHash }
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
      return filePath
    }
  }

  return null
}

const getAndSetSpace = async (configstore) => {
  const currentSpaceName = configstore.get('currentSpaceName')
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

module.exports = { buildBlockConfig, removeSync, searchFile, addBlockWorkSpaceCommits, getAndSetSpace }
