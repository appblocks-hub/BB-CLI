/* eslint-disable no-use-before-define */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { existsSync, writeFileSync } = require('fs')
const { rm, rename, readFile, cp, mkdir } = require('fs/promises')
const path = require('path')
const { configstore } = require('../configstore')
const create = require('../subcommands/create')
const { blockTypeInverter } = require('./blockTypeInverter')
const { CreateError } = require('./errors/createError')
const { moveFiles, prepareFileListForMoving, ensureDirSync } = require('./fileAndFolderHelpers')
const { GitManager } = require('./gitmanager')
const { confirmationPrompt, readInput } = require('./questionPrompts')

/**
 * Reads and parses the json from the given path
 * @param {string} s
 * @returns {object}
 */
async function readJsonAsync(s) {
  if (typeof s !== 'string') return { data: null, err: true }
  try {
    const file = await readFile(s)
    const data = JSON.parse(file)
    return { data, err: null }
  } catch (err) {
    return { data: null, err }
  }
}

// const generateArchiveName = (name) => `archived_${name}`
const archiveBlock = async (blockPath, configFileName) => {
  const _configfilename = configFileName || 'block.config.json'
  await rename(blockPath, `${blockPath}_archive_`)
  await rename(
    path.join(`${blockPath}_archive_`, _configfilename),
    path.join(`${blockPath}_archive_`, `old_${_configfilename}`)
  )
}
const unArchiveBlock = async (blockPath, configFileName) => {
  const _configfilename = configFileName || 'block.config.json'
  await rename(
    path.join(`${blockPath}_archive_`, `old_${_configfilename}`),
    path.join(`${blockPath}_archive_`, _configfilename)
  )
  await rename(`${blockPath}_archive_`, blockPath)
}

/**
 * @typedef {object} createDataPart
 * @property {string} clonePath
 * @property {string} cloneDirName
 * @property {import('./jsDoc/types').dependecyMetaShape} blockDetails
 */
/**
 *
 * @param {*} type
 * @param {*} ele
 * @param {*} blockName
 * @returns {Promise<{data?:createDataPart,err:boolean}>}
 */
const handleCreate = async (type, ele, blockName) => {
  try {
    const _opts = { type: blockTypeInverter(type) || null, autoRepo: true }
    const _args = [blockName, _opts, null, true, path.dirname(ele), false]
    const _ = await create(..._args)

    console.debug(`Created block successfully`)
    return {
      data: {
        clonePath: _.clonePath,
        cloneDirName: _.cloneDirName,
        blockDetails: _.blockDetails,
      },
      err: false,
    }
  } catch (err) {
    if (err instanceof CreateError) {
      console.debug(`Creation of ${blockName} with data from ${ele} failed`)
    } else {
      console.debug(err)
    }

    return { data: null, err: true }
  }
}

/**
 * @typedef {object} report
 * @property {String} oldPath
 * @property {boolean} registered
 * @property {boolean} copied
 * @property {string} directory
 * @property {boolean} sourcemismatch
 * @property {string} name
 * @property {string} newName
 * @property {object} data
 */

/**
 * From a list of absolute paths to directories, prompts user
 * and call create function and set new block folders accordingly
 * @param {Array<string>} list A List of absolute paths
 * @returns {Promise<Array<report>>}
 */
async function offerAndCreateBlock(list) {
  /**
   * @type {report}
   */
  const report = []

  if (list.length === 0) return []

  const ans = await confirmationPrompt({
    name: 'createBlockFromstale',
    message: `Should I create blocks from above ${list.length > 1 ? `directories` : `directory`}`,
    default: false,
  })

  if (!ans) {
    return []
  }

  for (let i = 0; i < list.length; i += 1) {
    report[i] = await x(list[i])
  }

  return report
}

const x = async (ele) => {
  /**
   * @type {report}
   */
  const report = { oldPath: ele, registered: false, copied: false }

  const dirExists = existsSync(ele)
  if (!dirExists) return report

  console.debug(`Started processing for ${ele}`)

  const hasGitFolder = existsSync(path.resolve(ele, '.git'))

  const { data: existingConfig, error } = await readJsonAsync(path.join(ele, 'block.config.json'))

  if (error) {
    console.log(`Error reading config from ${ele}`)
    return report
  }

  console.debug(`Read config from ${ele}`)

  const { name, type } = existingConfig

  const registerCurrentBlock = await confirmationPrompt({
    name: `block-${name}`,
    message: `Should i register ${ele}`,
    default: false,
  })
  if (!registerCurrentBlock) return report

  /**
   * If user has decided to register the contents of the directory as a block,
   * copy the contents of the folder to a temp folder, and later copy all to new location
   */

  const tempPath = path.normalize('./.temp')

  ensureDirSync(tempPath)

  console.debug(`Created a temp directory`)

  let erroInCopyingBlockToTemp = null
  let errorRemovingTempDir = null

  await cp(ele, tempPath, { recursive: true }).catch(() => {
    erroInCopyingBlockToTemp = true
  })

  if (erroInCopyingBlockToTemp) {
    console.debug(`Error copying to temp`)
    await rm(tempPath, { recursive: true, retryDelay: 200, force: true }).catch(() => {
      errorRemovingTempDir = true
    })
  }

  if (errorRemovingTempDir) {
    console.debug(`Error removing .temp`)
    return report
  }

  if (erroInCopyingBlockToTemp) {
    return report
  }

  // rename the original directory
  await archiveBlock(ele)

  console.debug(`Archived ${ele}`)

  let blockName = name
  if (!name) {
    blockName = await readInput({ name: 'blockName', message: 'Enter a block name' })
  }

  console.debug(`User wants to name the block - ${blockName}`)

  const interactive = false

  const { data: cd, err: cdErr } = await handleCreate(type, ele, blockName)
  if (cdErr) {
    console.debug(`Error in creating ${blockName}.`)
    report.registered = false
    report.copied = false
    await unArchiveBlock(ele)
    await rm(tempPath, { recursive: true })
    console.debug(`temp folder removed`)
    return report
  }

  const { blockDetails, clonePath, cloneDirName } = cd

  console.debug({ clonePath })
  console.debug({ cloneDirName })
  console.debug({ blockDetails })

  const newPath = path.join(clonePath, cloneDirName)

  console.debug({ newPath })

  report.directory = newPath
  report.registered = true
  report.sourcemismatch = false
  report.name = blockName
  report.newName = blockDetails.name
  report.data = {
    detailsInRegistry: blockDetails,
    localBlockConfig: blockDetails,
  }

  /**
   * If user wants git history, they can copy the git folder to new location, but don't replace the git config file
   */
  const ignoreList = ['.git', 'block.config.json']

  // TODO: make GitManager handle the url set
  const url = configstore.get('prefersSsh') ? blockDetails.source.ssh : blockDetails.source.https
  const Git = new GitManager(path.normalize(`${newPath}`), cloneDirName, url, configstore.get('prefersSsh'))

  /**
   * Cases new :
   *            User has unregistered block with foldername,blockname as ABC, registers it as ABC -
   *            (because name is availabe in that space ), git has no conflicts etc..
   *
   *            ABC as foldername and blockname, ABC is available in current space, but not in git,
   *            so gets prefixed with space id. create generates a clone with folder name <space-id><blockname>
   *
   *            ABC as f & b, ABC not available in space -> ABC_1, git same as ABC_1
   *
   *            ABC as f&b, ABC not available in space -> ABC_1, not available in git -> <space-d>ABC_1
   *
   */

  const newConfig = {
    ...existingConfig,
    name: blockDetails.name,
    source: blockDetails.source,
  }
  writeFileSync(`${newPath}/block.config.json`, JSON.stringify(newConfig, null, 2))
  console.debug(`New config written to ${newPath}`)
  /**
   * @type {Boolean}
   */
  let userWantsToMoveFiles = false
  let userWantsToMoveGitHistory = false
  /**
   * Check if initial directory name and newly registered name is same
   * @type {Boolean}
   */
  const hasSameName = path.basename(ele) === newConfig.name
  const repoNameIsSameAsBlockName = cloneDirName === newConfig.name

  console.debug({ repoNameIsSameAsBlockName })

  console.debug({ hasSameName })

  /**
   * IMPORTANT: same block name doesn't guarantee same repo name
   */

  if (interactive) {
    userWantsToMoveFiles = await confirmationPrompt({
      message: 'Should I move all files to new location',
      default: true,
      name: 'moveBlockCode',
    })
  }
  if (!interactive) userWantsToMoveFiles = true

  /**
   * If new block has same name as initial directory, and later had a git directory -> prompt.
   * If user wants to move all files ( if registered in a new name ), and initial had a
   *  git directory -> prompt
   */

  /**
   * @type {boolean} User wants to move all files from a block folder that has a .git,
   * to the new block folder that doesn't have the same block name
   */
  if (userWantsToMoveFiles && hasGitFolder && interactive) {
    userWantsToMoveGitHistory = await confirmationPrompt({
      message: 'Should i copy the git history',
      default: false,
      name: 'copyGitHistory',
    })
  }
  if (userWantsToMoveFiles && hasGitFolder && !interactive) {
    userWantsToMoveGitHistory = true
  }

  console.debug({ userWantsToMoveFiles, userWantsToMoveGitHistory })

  if (!userWantsToMoveFiles && !userWantsToMoveGitHistory) {
    console.log(`Please move the necessary files ${ele} to ${newPath}`)
    console.log(`In ${newPath} checkout to a main git branch and commit, then push`)
    console.log(`Using "bb push" will run into error as ${newPath} does not have a HEAD set`)
    report.copied = false
    // return report
  }

  if (userWantsToMoveFiles) {
    const files = await prepareFileListForMoving(tempPath, newPath, ignoreList)
    if (files.length) {
      await moveFiles(false, files)
    }
    report.copied = true

    await Git.checkoutbranch('main')
    await Git.commit('happy hacking from appblock team!', '--allow-empty')
    await Git.setUpstreamAndPush('main')
    userWantsToMoveFiles = false
  }

  console.debug(`Files moved from ${tempPath} to ${newPath}`)

  if (userWantsToMoveGitHistory) {
    const target = path.normalize(`${newPath}/.git`)
    const source = path.normalize(`${tempPath}/.git`)
    const files = await prepareFileListForMoving(source, target, ['config'])
    if (files.length) await moveFiles(files)
    report.copied = true
    await Git.setUpstreamAndPush()
    userWantsToMoveGitHistory = false
  }
  console.debug(`Git files moved from ${tempPath} to ${newPath}`)

  await rm(tempPath, { recursive: true, retryDelay: 200, force: true })
  console.debug(`temp directory deleted`)

  /**
   * Create a dir with new block name, copy all files from cloneDir & delete cloneDir
   * Cloned dir may be names <space-id><block-name>, but the user doesn't want that in local
   * so sopy that to a folder with name <block-name>
   */
  await mkdir(path.join(clonePath, newConfig.name), { recursive: true })
  const files = await prepareFileListForMoving(newPath, path.join(clonePath, newConfig.name))
  if (files.length) {
    await moveFiles(false, files)
  }
  console.debug(`Files moved from ${newPath} to ${path.join(clonePath, newConfig.name)}`)
  // if moving fails, delete the newPath & as user to run 'git clone cloneDirname newConfig.name'
  await rm(newPath, { recursive: true, retryDelay: 200, force: true })
  console.debug(`${newPath} removed`)
  console.debug('Completed')

  return report
}
module.exports = { offerAndCreateBlock }
