/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const semver = require('semver')
const { configstore } = require('../../configstore')
const { spinnies } = require('../../loader')
const { appBlockAddVersion } = require('../../utils/api')
const convertGitSshUrlToHttps = require('../../utils/convertGitUrl')
const { ensureReadMeIsPresent, uploadReadMe } = require('../../utils/fileAndFolderHelpers')
const { getShieldHeader } = require('../../utils/getHeaders')
const { isClean, getLatestVersion } = require('../../utils/gitCheckUtils')
const { GitManager } = require('../../utils/gitmanager')
const { pushBlocks } = require('../../utils/pushBlocks')
const { readInput, confirmationPrompt, getGitConfigNameEmail } = require('../../utils/questionPrompts')
const { updateReadme } = require('../../utils/registryUtils')
const { getLanguageVersionData } = require('../languageVersion/util')
const { getDependenciesV2, getDependencyIds } = require('../publish/dependencyUtil')

/**
 *
 * @param {BlockConfigManager} manager
 * @returns
 */
const createBlockVersion = async (manager, blockName) => {
  // if (!manager.has(blockName)) {
  //   console.log('Block not found!')
  //   process.exit(1)
  // }

  if (manager.isLive()) {
    console.log('Block is live, please stop before operation')
    process.exit(1)
  }

  // TODO - Check if there are any .sync files in the block and warn
  // const blockDetails = appConfig.getBlock(blockName)

  // const latestVersion = getLatestVersion(blockDetails.directory)
  const latestVersion = getLatestVersion(manager.directory)

  if (latestVersion) console.log(`Last published version is ${latestVersion}`)

  if (!isClean(manager.directory)) {
    console.log('Git directory is not clean, Please push before publish')
    process.exit(1)
  }

  // ------------------------------------------ //
  const [readmePath] = ensureReadMeIsPresent(manager.directory, blockName, false)
  if (!readmePath) {
    console.log('Make sure to add a README.md ')
    process.exit(1)
  }

  spinnies.add('p1', { text: `Getting blocks details` })
  const blockId = await manager.getBlockId()
  spinnies.remove('p1')
  spinnies.stopAll()

  const version = await readInput({
    name: 'version',
    message: 'Enter the version',
    validate: (ans) => {
      if (semver.valid(ans)) {
        if (latestVersion && semver.lt(semver.clean(ans), semver.clean(latestVersion))) {
          return `Last published version is ${latestVersion}`
        }
        return true
      }
      return 'Invalid versioning'
    },
    default: latestVersion ? semver.inc(latestVersion, 'patch') : '0.0.1',
  })

  const message = await readInput({
    name: 'tagMessage',
    message: 'Enter a message to add to tag.(defaults to empty)',
  })

  // check for abVersion langVersion Dependencies support for block
  const { supportedAppblockVersions } = manager.config
  let appblockVersionIds

  if (!supportedAppblockVersions) {
    throw new Error(`Please set-appblock-version and try again`)
  }

  // ========= languageVersion ========================
  const { languageVersionIds, languageVersions, allSupported } = await getLanguageVersionData({
    blockDetails: manager.config,
    appblockVersionIds,
    supportedAppblockVersions,
  })

  if (!allSupported) {
    const goAhead = await confirmationPrompt({
      message: `Some appblock version doesn't have support for given languages. Do you want to continue ?`,
      name: 'goAhead',
      default: false,
    })

    if (!goAhead) throw new Error(`Cancelled on no support`)
  }

  // ========= dependencies ========================
  // Check if the dependencies exit to link with block
  const { dependencies, depExist } = await getDependenciesV2({ blockDetails: manager.config })
  if (!depExist) {
    const noDep = await readInput({
      type: 'confirm',
      name: 'noDep',
      message: 'No package dependencies found to link with block. Do you want to continue ?',
      default: true,
    })

    if (!noDep) process.exit(1)
  } else {
    // eslint-disable-next-line prefer-const
    const { isAllDepExist } = await getDependencyIds({
      languageVersionIds,
      dependencies,
      languageVersions,
      noRequest: true,
      blockName: manager.config.name,
    })
    if (!isAllDepExist) {
      const goAhead = await confirmationPrompt({
        message: `Appblock version doesn't have support for some dependencies. Do you want to continue ?`,
        name: 'goAhead',
        default: false,
      })

      if (!goAhead) throw new Error(`Cancelled on no support`)
    }
  }

  manager.updateConfig({ blockVersion: version })
  // appConfig.updateBlock(blockName, { blockVersion: version })
  const { gitUserName, gitUserEmail } = await getGitConfigNameEmail()

  spinnies.add('p1', { text: `Creating new version ${version}` })
  await pushBlocks(gitUserName, gitUserEmail, `refactor: version ${version}`, [manager], true)

  spinnies.update('p1', { text: `Tagging new version ${version}` })

  const blockSource = manager.config.source
  const prefersSsh = configstore.get('prefersSsh')
  const repoUrl = prefersSsh ? blockSource.ssh : convertGitSshUrlToHttps(blockSource.ssh)
  const Git = new GitManager(manager.directory, 'Not very imp', repoUrl, prefersSsh)
  // await pushTags(blockDetails.directory)
  await Git.addTag(version, message)
  await Git.pushTags()

  // Update source code to appblock cloud

  spinnies.update('p1', { text: `Registering new version ${version}` })

  const reqBody = {
    block_id: blockId,
    version_no: semver.parse(version).version,
    status: 1,
    release_notes: message,
  }

  if (supportedAppblockVersions && appblockVersionIds?.length < 1) {
    reqBody.appblock_versions = supportedAppblockVersions
    delete reqBody.appblock_version_ids
  }

  const resp = await axios.post(appBlockAddVersion, reqBody, { headers: getShieldHeader() })

  const { data } = resp
  if (data.err) {
    throw new Error('Something went wrong from our side\n', data.msg).message
  }
  const versionId = data?.data?.id

  spinnies.update('p1', { text: `Uploading readme` })
  const res = await uploadReadMe(readmePath, blockId, versionId)
  if (res.status !== 200) {
    throw new Error('Something went wrong while uploading readme.')
  }

  spinnies.update('p1', { text: `Updating readme` })
  const upResp = await updateReadme(blockId, versionId, res.key)
  if (upResp.status !== 200) {
    throw new Error('Something went wrong while updating readme.')
  }
  spinnies.update('p1', { text: `ReadMe updated successfully` })

  spinnies.succeed('p1', { text: `new version created successfully` })

  return { blockId, versionId }
}

module.exports = createBlockVersion
