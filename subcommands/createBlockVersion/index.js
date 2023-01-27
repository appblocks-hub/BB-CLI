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
const { appConfig } = require('../../utils/appconfigStore')
const convertGitSshUrlToHttps = require('../../utils/convertGitUrl')
const { ensureReadMeIsPresent, uploadReadMe } = require('../../utils/fileAndFolderHelpers')
const { getShieldHeader } = require('../../utils/getHeaders')
const { isClean, getLatestVersion } = require('../../utils/gitCheckUtils')
const { GitManager } = require('../../utils/gitmanager')
const { readInput } = require('../../utils/questionPrompts')
const { updateReadme } = require('../../utils/registryUtils')

const createBlockVersion = async (blockname) => {
  await appConfig.init(null, null)

  if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
    // eslint-disable-next-line no-param-reassign
    blockname = appConfig.allBlockNames.next().value
  }

  if (!appConfig.has(blockname)) {
    console.log('Block not found!')
    process.exit(1)
  }

  if (appConfig.isLive(blockname)) {
    console.log('Block is live, please stop before operation')
    process.exit(1)
  }

  // TODO - Check if there are any .sync files in the block and warn
  const blockDetails = appConfig.getBlock(blockname)

  try {
    const latestVersion = getLatestVersion(blockDetails.directory)
    if (latestVersion) console.log(`Last published version is ${latestVersion}`)

    if (!isClean(blockDetails.directory)) {
      console.log('Git directory is not clean, Please push before publish')
      process.exit(1)
    }

    // ------------------------------------------ //
    const [readmePath] = ensureReadMeIsPresent(blockDetails.directory, blockname, false)
    if (!readmePath) {
      console.log('Make sure to add a README.md ')
      process.exit(1)
    }

    spinnies.add('p1', { text: `Getting blocks details` })
    const blockId = await appConfig.getBlockId(blockname)
    spinnies.remove('p1')

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

    spinnies.add('p1', { text: `Creating new version ${version}` })

    const blockSource = blockDetails.meta.source
    const prefersSsh = configstore.get('prefersSsh')
    const repoUrl = prefersSsh ? blockSource.ssh : convertGitSshUrlToHttps(blockSource.ssh)
    const Git = new GitManager(blockDetails.directory, 'Not very imp', repoUrl, prefersSsh)
    // await pushTags(blockDetails.directory)
    await Git.addTag(version, message)
    await Git.pushTags()

    // Update source code to appblock cloud

    spinnies.update('p1', { text: `Registring new version ${version}` })

    const resp = await axios.post(
      appBlockAddVersion,
      {
        block_id: blockId,
        version_no: semver.parse(version).version,
        status: 1,
        release_notes: message,
      },
      { headers: getShieldHeader() }
    )

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
    spinnies.update('p1', { text: `ReadMe updated succesfully` })

    spinnies.succeed('p1', { text: `new version created successfully` })
  } catch (error) {
    spinnies.add('p1', { text: 'Error' })
    spinnies.fail('p1', { text: error.message })
    process.exit(1)
  }
}

module.exports = createBlockVersion
