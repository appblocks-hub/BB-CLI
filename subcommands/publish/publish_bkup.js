/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const { readFileSync } = require('fs')
const semver = require('semver')
const { configstore } = require('../../configstore')
const { spinnies } = require('../../loader')
const { appBlockAddVersion, createSourceCodeSignedUrl } = require('../../utils/api')
const { appConfig } = require('../../utils/appconfigStore')
const convertGitSshUrlToHttps = require('../../utils/convertGitUrl')
const { getShieldHeader } = require('../../utils/getHeaders')
const { isClean, getLatestVersion, addTag } = require('../../utils/gitCheckUtils')
const { GitManager } = require('../../utils/gitmanager')
const { readInput } = require('../../utils/questionPrompts')
const { getAllBlockVersions } = require('../../utils/registryUtils')
const { addDependencies, getDependencies } = require('./dependencyUtil')
const { addLanguageVersions, getUpdatedLanguageVersionsData } = require('../languageVersion/util')
const { createZip } = require('./util')

const publish = async (blockname) => {
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

    let latestVersionId

    const blockId = await appConfig.getBlockId(blockname)
    if (latestVersion) {
      const { data } = await getAllBlockVersions(blockId)
      latestVersionId = data.data?.[0].id
    }

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

    // ========= languageVersion ========================
    const { addLanguageVersionsList } = await getUpdatedLanguageVersionsData({
      blockDetails,
      blockId,
      blockVersionId: latestVersionId,
      blockVersion: version,
      isNew: true,
    })

    // ========= dependencies ========================
    // Check if the dependencies exit to link with block
    const { dependencies, depExist } = await getDependencies({ blockDetails })
    if (!depExist) {
      const noDep = await readInput({
        type: 'confirm',
        name: 'noDep',
        message: 'No package dependecies found to link with block. Do you want to continue ?',
        default: true,
      })

      if (!noDep) process.exit(1)
    }

    spinnies.add('p1', { text: `Publishing new version ${version}` })

    await addTag(blockDetails.directory, version, message)

    const blockSource = blockDetails.meta.source
    const prefersSsh = configstore.get('prefersSsh')
    const repoUrl = prefersSsh ? blockSource.ssh : convertGitSshUrlToHttps(blockSource.ssh)
    const Git = new GitManager(blockDetails.directory, 'Not very imp', repoUrl, prefersSsh)
    // await pushTags(blockDetails.directory)
    await Git.pushTags()

    // Update source code to appblock cloud

    spinnies.update('p1', { text: `Updating new version ${version} code` })

    const zipFile = await createZip({ directory: blockDetails.directory, version })

    const preSignedData = await axios.post(
      createSourceCodeSignedUrl,
      {
        block_type: blockDetails.meta.type,
        block_id: blockId,
        block_name: blockDetails.meta.name,
        block_version: version,
      },
      {
        headers: getShieldHeader(),
      }
    )
    const zipFileData = readFileSync(zipFile)
    await axios.put(preSignedData.data.url, zipFileData, {
      headers: {
        'Content-Type': 'application/zip',
      },
    })

    spinnies.update('p1', { text: `Registring new version ${version}` })

    const resp = await axios.post(
      appBlockAddVersion,
      {
        block_id: blockId,
        version_no: semver.parse(version).version,
        status: 1,
        release_notes: message,
        source_code_key: preSignedData.data.key,
      },
      { headers: getShieldHeader() }
    )

    const { data } = resp
    if (data.err) {
      throw new Error('Something went wrong from our side\n', data.msg).message
    }

    // Link languageVersion to block
    spinnies.update('p1', { text: `Attaching languageVersion to block` })
    await addLanguageVersions({ addLanguageVersionsList, blockId, blockVersionId: data.data.id })

    // Link Dependecies to block
    if (depExist) {
      spinnies.update('p1', { text: `Attaching dependencies to block` })
      await addDependencies({ dependencies, blockId, blockVersionId: data.data.id })
    }

    spinnies.succeed('p1', { text: 'Block published successfully' })
  } catch (error) {
    console.log(error)
    spinnies.add('p1_error', { text: 'Error' })
    spinnies.fail('p1_error', { text: error.message })
    process.exit(1)
  }
}

module.exports = publish
