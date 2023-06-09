/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { readFileSync } = require('fs')
const { default: axios } = require('axios')
const { spinnies } = require('../../loader')
const { createSourceCodeSignedUrl, publishBlockApi } = require('../../utils/api')
const { getShieldHeader } = require('../../utils/getHeaders')
const { getDependencies, getDependencyIds } = require('./dependencyUtil')
const { getLanguageVersionData } = require('../languageVersion/util')
const { createZip } = require('./util')
const { post } = require('../../utils/axios')
const { GitManager } = require('../../utils/gitManagerV2')

const publishBlock = async ({ blockManager, zipFile, versionData }) => {
  const { name: blockName, supportedAppblockVersions, source, repoType } = blockManager.config
  const version = versionData.version_number

  if (!supportedAppblockVersions) {
    throw new Error(`Please set-appblock-version and try again`)
  }

  let appblockVersionIds

  // ========= languageVersion ========================
  const { languageVersionIds, languageVersions } = await getLanguageVersionData({
    blockDetails: { directory: blockManager.directory, meta: blockManager.config },
    appblockVersionIds,
    supportedAppblockVersions,
    noWarn: true,
  })

  let dependency_ids = []
  const { dependencies } = await getDependencies({
    blockDetails: { directory: blockManager.directory, meta: blockManager.config },
  })
  spinnies.add('p1', { text: `Getting dependency details for version ${version}` })
  // eslint-disable-next-line prefer-const
  const { depIds } = await getDependencyIds({
    languageVersionIds,
    dependencies,
    languageVersions,
    noWarn: true,
    blockName,
  })
  spinnies.remove('p1')
  dependency_ids = depIds

  spinnies.add('p1', { text: `Uploading new version ${version}` })

  if (repoType === 'multi') {
    const Git = new GitManager(blockManager.directory, source.ssh)
    try {
      await Git.fetch('--all --tags')
      Git.checkoutTagWithNoBranch(version)
      // eslint-disable-next-line no-param-reassign
      zipFile = await createZip({ blockName, directory: blockManager.directory, source, version })
      Git.undoCheckout()
    } catch (error) {
      Git.undoCheckout()
      throw error
    }
  }

  const preSignedData = await axios.post(
    createSourceCodeSignedUrl,
    {
      block_type: blockManager.config.type,
      block_id: blockManager.config.blockId,
      block_name: blockName,
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
    block_id: blockManager.config.blockId,
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
}

module.exports = publishBlock
