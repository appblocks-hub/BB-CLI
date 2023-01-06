/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const open = require('open')
const { readFileSync } = require('fs')
const { default: axios } = require('axios')
const { spinnies } = require('../../loader')
const { createSourceCodeSignedUrl, publishBlockApi, publishRedirectApi } = require('../../utils/api')
const { appConfig } = require('../../utils/appconfigStore')
const { getShieldHeader } = require('../../utils/getHeaders')
const { readInput } = require('../../utils/questionPrompts')
const { getAllBlockVersions } = require('../../utils/registryUtils')
const { getDependencies, addDependencies, getDependencyIds } = require('./dependencyUtil')
const { getLanguageVersionData } = require('../languageVersion/util')
const { createZip, getAppblockVersionData } = require('./util')
const { post } = require('../../utils/axios')

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
    spinnies.add('p1', { text: `Getting block versions` })
    const blockId = await appConfig.getBlockId(blockname)
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

    // ========= appblockVersion ========================
    const { appblockVersionId } = await getAppblockVersionData()

    // ========= languageVersion ========================
    const { languageVersionId } = await getLanguageVersionData({ blockDetails, appblockVersionId })

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

    spinnies.add('p1', { text: `Uploading new version ${version}` })

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

    let dependency_ids = []
    if (depExist) {
      spinnies.update('p1', { text: `Getting dependency details ${version}` })
      // eslint-disable-next-line prefer-const
      const { depIds, newDeps } = await getDependencyIds({ languageVersionId, dependencies })
      dependency_ids = depIds
      if (newDeps.length > 0) {
        await addDependencies({ languageVersionId, dependencies: newDeps })
        const { depIds: latestDepIds } = await getDependencyIds({ languageVersionId, dependencies })
        dependency_ids = latestDepIds
      }
    }

    // Link languageVersion to block
    spinnies.update('p1', { text: `Publishing block` })
    const { error } = await post(publishBlockApi, {
      dependency_ids,
      block_id: blockId,
      block_version_id: versionData.id,
      appblock_version_id: appblockVersionId,
      language_version_id: languageVersionId,
      source_code_key: preSignedData.data.key,
    })

    if (error) throw error

    spinnies.succeed('p1', { text: 'Block published successfully' })
    await open(`${publishRedirectApi}`)
  } catch (error) {
    spinnies.add('p1_error', { text: 'Error' })
    spinnies.fail('p1_error', { text: error.message })
    process.exit(1)
  }
}

module.exports = publish
