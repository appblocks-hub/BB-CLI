/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const semver = require('semver')
const { writeFileSync } = require('fs')

const { spinnies } = require('../../loader')
const { appBlockAddVersion } = require('../../utils/api')
const { ensureReadMeIsPresent } = require('../../utils/fileAndFolderHelpers')
const { isCleanBlock } = require('../../utils/gitCheckUtils')
const { readInput } = require('../../utils/questionPrompts')
const { checkLangDepSupport, uploadBlockReadme } = require('./utils')
const { post } = require('../../utils/axios')
const { getAllBlockVersions } = require('../../utils/registryUtils')
const GitConfigFactory = require('../../utils/gitManagers/gitConfigFactory')

const createBlockVersion = async ({ blockManager, cmdOptions }) => {
  const blockConfig = blockManager.config

  const { repoType, name: blockName, supportedAppblockVersions, blockId, orphanBranchFolder } = blockConfig
  const { force } = cmdOptions || {}

  spinnies.add('bv', { text: `Checking block versions` })
  const bkVersions = await getAllBlockVersions(blockId)
  spinnies.remove('bv')
  const latestVersion = bkVersions.data?.data?.[0]?.version_number
  if (latestVersion) console.log(`Latest created version is ${latestVersion}`)

  isCleanBlock(blockManager.directory, blockName)

  // ------------------------------------------ //
  const [readmePath] = ensureReadMeIsPresent(blockManager.directory, blockName, false)
  if (!readmePath) throw new Error('Make sure to add a README.md ')

  if (!blockId) {
    throw new Error('No blockId found in config! Make sure block is synced')
  }

  // check for abVersion langVersion Dependencies support for block
  let appblockVersionIds

  if (!supportedAppblockVersions) {
    throw new Error(`Please set appblock version and try again`)
  }

  // ========= check language & dependencies support ========================
  await checkLangDepSupport({ force, blockManager, appblockVersionIds, supportedAppblockVersions })

  spinnies.stopAll()
  const version =
    cmdOptions.version ||
    (await readInput({
      name: 'version',
      message: 'Enter the version',
      validate: (ans) => {
        if (!semver.valid(ans)) return 'Invalid version! Please use semantic versioning (major.minor.patch)'
        if (latestVersion && semver.lt(semver.clean(ans), semver.clean(latestVersion))) {
          return `Last created version is ${latestVersion}`
        }
        return true
      },
      default: latestVersion ? semver.inc(latestVersion, 'patch') : '0.0.1',
    }))

  if (!semver.valid(version)) {
    throw new Error('Invalid version! Please use semantic versioning (major.minor.patch)')
  }

  const versionNote =
    cmdOptions.versionNote ||
    (await readInput({
      name: 'versionNote',
      message: 'Enter the version note (defaults to empty)',
    }))

  const blockConfigData = { ...blockConfig }
  delete blockConfigData.orphanBranchFolder
  delete blockConfigData.workSpaceFolder

  // Update source code to appblock cloud
  spinnies.add('cv', { text: `Registering new version ${version}` })

  const reqBody = {
    block_id: blockId,
    version_no: semver.parse(version).version,
    status: 1,
    release_notes: versionNote,
    app_config: blockConfigData,
    parent_block_ids: blockConfigData.parentBlockIDs || [],
  }

  if (supportedAppblockVersions && appblockVersionIds?.length < 1) {
    reqBody.appblock_versions = supportedAppblockVersions
    delete reqBody.appblock_version_ids
  }

  const { data, error } = await post(appBlockAddVersion, reqBody)
  if (error) throw error

  const versionId = data.data?.id

  // upload and update readme
  await uploadBlockReadme({ readmePath, blockId, versionId })

  if (repoType === 'mono') {
    // handle mono repo git flow
    const parentBranch = blockConfig.source.branch
    const releaseBranch = `block_${blockName}@${version}`

    const { manager: Git, error: gErr } = await GitConfigFactory.init({
      cwd: orphanBranchFolder,
      gitUrl: blockConfig.source.ssh,
    })
    if (gErr) throw gErr

    try {
      await Git.createReleaseBranch(releaseBranch, parentBranch)

      blockConfigData.version = version
      blockConfigData.versionId = versionId
      writeFileSync(path.join(orphanBranchFolder, blockManager.configName), JSON.stringify(blockConfigData, null, 2))

      await Git.stageAll()
      await Git.commit(`release branch for version ${version}`)
      await Git.push(releaseBranch)
    } catch (err) {
      if (!['already exists', 'tree clean'].some((e) => err.message.includes(e))) {
        throw err
      }
    }
  } else if (repoType === 'multi') {
    // handle multi repo git flow
    // TODO check and setup the correct workflow

    const { manager: Git, error: gErr } = await GitConfigFactory.init({
      cwd: blockManager.directory,
      gitUrl: blockConfig.source.ssh,
    })
    if (gErr) throw gErr

    await Git.addTag(version, versionNote)
    await Git.pushTags()
  }

  spinnies.succeed('cv', { text: `new version created successfully` })

  return { blockId, versionId }
}

module.exports = createBlockVersion
