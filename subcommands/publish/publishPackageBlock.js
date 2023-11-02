/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const path = require('path')
const { readFileSync } = require('fs')
const { spinnies } = require('../../loader')
const { publishBlockApi, createSourceCodeSignedUrl } = require('../../utils/api')
const { post } = require('../../utils/axios')
const { getLanguageVersionData } = require('../languageVersion/util')
const { createZip, buildBlockTypesMap } = require('./util')
const {  BB_EXCLUDE_FILES_FOLDERS } = require('../../utils/bbFolders')


const publishPackageBlock = async ({ packageManager, zipFile, versionData }) => {
  const {
    supportedAppblockVersions,
    name: blockName,
    blockId: pkBlockId,
    repoType,
    source,
    dependencies,
  } = packageManager.config

  if (!supportedAppblockVersions) {
    throw new Error(`Please set-appblock-version and try again`)
  }

  if (repoType === 'multi') {
    spinnies.add('p1', { text: `Uploading new version ${versionData.version_number}` })
    const ignoresApCreated = BB_EXCLUDE_FILES_FOLDERS
    const gitignorePath = path.join('.', '.gitignore')
    const gitignoreData = readFileSync(gitignorePath).toString()
    const ignoreDependencies = Object.values(dependencies).map((v) => `${v.directory}/`)
    const excludePaths = ignoresApCreated
      .concat(ignoreDependencies)
      .reduce((acc, ig) => {
        if (acc.split('\n').includes(ig)) return acc
        return `${acc}\n${ig}`
      }, gitignoreData)
      .split('\n')
      .map((ex) => ex.replaceAll(/\/|(\.)\.(?=\/)|\*/g, '').replaceAll('..', '.'))
      .filter((e) => e !== '')

    // eslint-disable-next-line no-param-reassign, no-unreachable
    zipFile = await createZip({
      blockName,
      directory: '.',
      source,
      version: versionData.version_number,
      excludePaths,
    })
  }

  const blockTypesMap ={}

  await (buildBlockTypesMap({packageManager,blockTypesMap}))


  const { data: preSignedData, error } = await post(createSourceCodeSignedUrl, {
    block_type: 'package',
    block_id: pkBlockId,
    block_name: blockName,
    block_version: versionData.version_number,
  })

  if (error) throw error

  const zipFileData = readFileSync(zipFile)

  await axios.put(preSignedData.url, zipFileData, {
    headers: {
      'Content-Type': 'application/zip',
    },
  })

  // ========= languageVersion ========================
  const { languageVersionIds } = await getLanguageVersionData({ supportedAppblockVersions })

  const reqBody = {
    block_id: pkBlockId,
    source_code_key: preSignedData.key,
    block_version_id: versionData.id,
    appblock_versions: supportedAppblockVersions,
    language_version_ids: languageVersionIds,
    block_types_map:blockTypesMap
  }

  spinnies.add('p1', { text: 'Publishing package block' })
  const { error: pubErr } = await post(publishBlockApi, reqBody)
  if (pubErr) throw pubErr
  spinnies.succeed('p1', { text: 'Successfully published package block' })
}

module.exports = { publishPackageBlock }
