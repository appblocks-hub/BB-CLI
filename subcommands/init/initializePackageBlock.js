/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-case-declarations */
const path = require('path')
const chalk = require('chalk')
const { createFileSync, isDirEmpty } = require('../../utils/fileAndFolderHelpers')
const { getBlockName } = require('../../utils/questionPrompts')
const createBlock = require('../../utils/createBlock')
const checkBlockNameAvailability = require('../../utils/checkBlockNameAvailability')
const { checkAndSetGitConfigNameEmail } = require('../../utils/gitCheckUtils')
const { appConfig } = require('../../utils/appconfigStore')
const { configstore } = require('../../configstore')
const { GitManager } = require('../../utils/gitmanager')
const { isValidBlockName } = require('../../utils/blocknameValidator')
const { feedback } = require('../../utils/cli-feedback')
const { lrManager } = require('../../utils/locaRegistry/manager')
const getRepoUrl = require('../../utils/noRepo')
const initializeSpaceToPackageBlock = require('./initializeSpaceToPackageBlock')

const initializePackageBlock = async (appblockName, options) => {
  const { autoRepo } = options
  let componentName = appblockName
  if (!isValidBlockName(componentName)) {
    feedback({ type: 'warn', message: `${componentName} is not a valid name (Only snake case with numbers is valid)` })
    componentName = await getBlockName()
  }

  const availableName = await checkBlockNameAvailability(componentName)

  // If user is giving a url then no chance of changing this name
  let blockFinalName = availableName
  let blockSource
  let blockId
  let userHasProvidedRepoUrl = false

  if (!autoRepo) {
    blockSource = await getRepoUrl()
  }

  if (!autoRepo && !blockSource.ssh) {
    process.exitCode = 0
  }

  if (!autoRepo && blockSource.ssh) {
    userHasProvidedRepoUrl = true
  }

  if (autoRepo) {
    const d = await createBlock(availableName, availableName, 1, '', false, '.')
    blockFinalName = d.blockFinalName
    blockId = d.blockId
    blockSource = d.blockSource
  }

  const [dir] = [blockFinalName]
  const DIRPATH = path.resolve(dir)

  const prefersSsh = configstore.get('prefersSsh')
  const originUrl = prefersSsh ? blockSource.ssh : blockSource.https
  // INFO - Git is set in current directory, it could be having other git, might cause issue
  //        user is adviced to run in a new directory
  const Git = new GitManager('.', blockFinalName, originUrl, prefersSsh)
  if (userHasProvidedRepoUrl) {
    await Git.clone(DIRPATH)
    const emptyDir = await isDirEmpty(DIRPATH, '.git')
    if (!emptyDir) {
      console.log(`${chalk.bgRed('ERROR')}: Expected to find an empty repo`)
      process.exit(1)
    }
  }

  const CONFIGPATH = path.join(DIRPATH, 'block.config.json')
  createFileSync(CONFIGPATH, {
    name: blockFinalName,
    type: 'package',
    blockId,
    source: blockSource,
  })

  await checkAndSetGitConfigNameEmail(blockFinalName)

  Git.cd(path.resolve(blockFinalName)) // Change to git directory
  await Git.newBranch('main')
  await Git.stageAll()
  await Git.commit('initial app commit')
  await Git.setUpstreamAndPush('main')

  appConfig.init(path.resolve(blockFinalName))

  // Add packaged block into local registry
  await lrManager.init()
  lrManager.add = {
    name: blockFinalName,
    rootPath: path.resolve(blockFinalName),
  }

  await initializeSpaceToPackageBlock(blockFinalName)

  return { DIRPATH, blockFinalName, Git, prefersSsh }
}

module.exports = initializePackageBlock
