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
const { getBlockName, sourceUrlOptions, readInput } = require('../../utils/questionPrompts')
const createBlock = require('../../utils/createBlock')
const checkBlockNameAvailability = require('../../utils/checkBlockNameAvailability')
const { checkAndSetGitConfigNameEmail } = require('../../utils/gitCheckUtils')
const { appConfig } = require('../../utils/appconfigStore')
const { configstore } = require('../../configstore')
const { GitManager } = require('../../utils/gitmanager')
const convertGitSshUrlToHttps = require('../../utils/convertGitUrl')
const { isValidBlockName } = require('../../utils/blocknameValidator')
const { feedback } = require('../../utils/cli-feedback')
const { lrManager } = require('../../utils/locaRegistry/manager')

const initializePackageBlock = async (appblockName) => {
  // const packagesPath = path.join(__dirname, '..', 'packages')
  let componentName = appblockName
  if (!isValidBlockName(componentName)) {
    feedback({ type: 'warn', message: `${componentName} is not a valid name` })
    componentName = await getBlockName()
  }
  // if dir is clean, create a config file with name for configstore to
  // initialize..

  const availableName = await checkBlockNameAvailability(componentName)

  // Check if github user name or id is not set (we need both, if either is not set inform)
  const u = configstore.get('githubUserId', '')
  const t = configstore.get('githubUserToken', '')

  // If user is giving a url then no chance of changing this name
  let blockFinalName = availableName
  let blockSource
  let userHasProvidedRepoUrl = false

  if (u === '' || t === '') {
    console.log(`${chalk.bgCyan('INFO')}:Seems like you have not connected to any version manager`)
    const o = await sourceUrlOptions()
    // 0 for cancel
    // 2 for go to connect
    // 3 for let me provide url
    if (o === 0) process.exit(1)
    else if (o === 2) {
      // INFO connecting to github from here might cause the same token in memory issue
      console.log('Cant do it now!')
    } else {
      const s = await readInput({ message: 'Enter source ssh url here', name: 'sUrl' })
      blockSource = { ssh: s.trim(), https: convertGitSshUrlToHttps(s.trim()) }
      userHasProvidedRepoUrl = true
    }
  } else {
    // const shortName = await getBlockShortName(availableName)
    // const { blockSource, cloneDirName, clonePath, blockFinalName } =
    const d = await createBlock(availableName, availableName, 1, '', false, '.')
    blockFinalName = d.blockFinalName
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
    type: 'appBlock',
    source: blockSource,
  })

  await checkAndSetGitConfigNameEmail(blockFinalName)

  // NOTE: blockFinalName doesnt need to have a prefix here..it is an app
  // execSync(
  //   `git checkout -b main &&
  // git add -A &&
  // git commit -m 'initial commit' &&
  // git push origin main`,
  //   { cwd: path.resolve(blockFinalName) }
  // )

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

  return { DIRPATH, blockFinalName, Git, prefersSsh }
}

module.exports = initializePackageBlock
