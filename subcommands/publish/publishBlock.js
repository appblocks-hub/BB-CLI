/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { readFileSync } = require('fs')
const { default: axios } = require('axios')
const { spinnies } = require('../../loader')
const { createSourceCodeSignedUrl, publishBlockApi } = require('../../utils/api')
const { getShieldHeader } = require('../../utils/getHeaders')
const { readInput } = require('../../utils/questionPrompts')
const { getAllBlockVersions } = require('../../utils/registryUtils')
const { getDependencies, getDependencyIds } = require('./dependencyUtil')
const { getLanguageVersionData } = require('../languageVersion/util')
const { createZip } = require('./util')
const { post } = require('../../utils/axios')
const { configstore } = require('../../configstore')
const convertGitSshUrlToHttps = require('../../utils/convertGitUrl')
const { GitManager } = require('../../utils/gitmanager')
const { isClean } = require('../../utils/gitCheckUtils')

const publishBlock = async ({ blockName, appConfig }) => {
  if (!appConfig.has(blockName)) {
    console.log('Block not found!')
    process.exit(1)
  }

  if (appConfig.isLive(blockName)) {
    console.log('Block is live, please stop before operation')
    process.exit(1)
  }

  // TODO - Check if there are any .sync files in the block and warn
  const blockDetails = appConfig.getBlock(blockName)

  if (!isClean(blockDetails.directory)) {
    console.log('Git directory is not clean, Please push before publish')
    process.exit(1)
  }

  const {
    meta: { source },
    directory,
  } = blockDetails

  const prefersSsh = configstore.get('prefersSsh')
  const originUrl = prefersSsh ? source.ssh : convertGitSshUrlToHttps(source.ssh)
  const Git = new GitManager(path.resolve(), directory, originUrl, prefersSsh)
  Git.cd(directory)
  await Git.fetch('--all --tags')

  try {
    spinnies.add('p1', { text: `Getting block versions` })
    const blockId = await appConfig.getBlockId(blockName)
    const { data } = await getAllBlockVersions(blockId, {
      status: [1],
    })
    spinnies.remove('p1')

    const blockVersions = data?.data || []

    if (blockVersions.length < 1) {
      console.log('No unreleased block versions found. Please create version and try again.')
      process.exit(1)
    }

    const versionData = await readInput({
      name: 'versionData',
      type: 'list',
      message: 'Select the version to publish',
      choices: blockVersions.map((v) => ({
        name: v.version_number,
        value: v,
      })),
      validate: (ans) => {
        if (!ans) return 'Invalid version'
        return true
      },
    })

    const version = versionData.version_number

    Git.checkoutTagWithNoBranch(version)

    const { supportedAppblockVersions } = blockDetails.meta
    let appblockVersionIds

    if (!supportedAppblockVersions) {
      throw new Error(`Please set-appblock-version and try again`)
    }

    // ========= languageVersion ========================
    const { languageVersionIds, languageVersions } = await getLanguageVersionData({
      blockDetails,
      appblockVersionIds,
      supportedAppblockVersions,
      noWarn: true,
    })

    let dependency_ids = []
    const { dependencies } = await getDependencies({ blockDetails })
    spinnies.add('p1', { text: `Getting dependency details for version ${version}` })
    // eslint-disable-next-line prefer-const
    const { depIds } = await getDependencyIds({
      languageVersionIds,
      dependencies,
      languageVersions,
      noWarn: true,
      blockName: blockDetails.meta.name,
    })
    spinnies.remove('p1')
    dependency_ids = depIds

    spinnies.add('p1', { text: `Uploading new version ${version}` })

    const zipFile = await createZip({ directory: blockDetails.directory, source: blockDetails.meta.source, version })

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

    // Link languageVersion to block
    spinnies.update('p1', { text: `Publishing block` })

    const reqBody = {
      dependency_ids,
      block_id: blockId,
      block_version_id: versionData.id,
      appblock_version_ids: appblockVersionIds,
      language_version_ids: languageVersionIds,
      source_code_key: preSignedData.data.key,
    }

    if (supportedAppblockVersions && !reqBody.appblock_version_ids) {
      reqBody.appblock_versions = supportedAppblockVersions
      delete reqBody.appblock_version_ids
    }

    const { error } = await post(publishBlockApi, reqBody)

    if (error) throw error

    spinnies.succeed('p1', { text: 'Block published successfully' })

    Git.undoCheckout()
  } catch (error) {
    Git.undoCheckout()
    spinnies.add('p1', { text: 'Error' })
    spinnies.fail('p1', { text: error.message })
    spinnies.stopAll()
    process.exit(1)
  }
}

module.exports = publishBlock
