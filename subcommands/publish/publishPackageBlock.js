/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { default: axios } = require('axios')
const path = require('path')
const chalk = require('chalk')
const { readFileSync } = require('fs')
const { spinnies } = require('../../loader')
const { publishBlockApi, createSourceCodeSignedUrl } = require('../../utils/api')
const { post } = require('../../utils/axios')
const { readInput } = require('../../utils/questionPrompts')
const { getAllBlockVersions } = require('../../utils/registryUtils')
const { getLanguageVersionData } = require('../languageVersion/util')
const { createZip } = require('./util')

const publishPackageBlock = async ({ appConfig }) => {
  if ([...appConfig.liveBlocks].length > 0) {
    console.log(chalk.red('Please stop all blocks before publishing!'))
    process.exit(1)
  }

  const pkBlockId = appConfig.config.blockId

  spinnies.add('p1', { text: `Getting package versions` })
  const { data } = await getAllBlockVersions(pkBlockId, { status: [1] })
  spinnies.remove('p1')

  const blockVersions = data?.data || []

  if (blockVersions.length < 1) {
    console.log('No unreleased block versions found. Please create version and try again.')
    process.exit(1)
  }

  const versionData = await readInput({
    name: 'versionData',
    type: 'list',
    message: 'Select the package version to publish',
    choices: blockVersions.map((v) => ({
      name: v.version_number,
      value: v,
    })),
    validate: (ans) => {
      if (!ans) return 'Invalid version'
      return true
    },
  })

  //   const { data: appConfigData, error } = await post(appBlockGetAppConfig, {
  //     block_id: pkBlockId,
  //     block_version_id: versionData.id,
  //   })

  //   if (error) throw error

  //   const selectedAppConfigData = appConfigData?.data?.app_config

  //   if (!selectedAppConfigData) throw new Error('Error getting app config data of selected version')

  spinnies.add('p1', { text: `Uploading new version ${versionData.version_number}` })
  const ignoresApCreated = [
    '._ab_em/*',
    '._ab_em_elements/*',
    '.env.function',
    '.env.view',
    '.tmp/*',
    '.deploy/*',
    '.deploy.config.json/*',
    'cliruntimelogs/*',
    'logs/*',
    'pushlogs/*',
  ]
  const gitignorePath = path.join('.', '.gitignore')
  const gitignoreData = readFileSync(gitignorePath).toString()
  const ignoreDependencies = Object.values(appConfig.config.dependencies).map((v) => `${v.directory}/`)
  const excludePaths = ignoresApCreated
    .concat(ignoreDependencies)
    .reduce((acc, ig) => {
      if (acc.split('\n').includes(ig)) return acc
      return `${acc}\n${ig}`
    }, gitignoreData)
    .split('\n')
    .map((ex) => ex.replaceAll(/\/|(\.)\.(?=\/)|\*/g, '').replaceAll('..', '.'))
    .filter((e) => e !== '')

  const zipFile = await createZip({
    directory: '.',
    source: appConfig.config.source,
    version: versionData.version_number,
    excludePaths,
  })

  const { data: preSignedData, error } = await post(createSourceCodeSignedUrl, {
    block_type: 'package',
    block_id: pkBlockId,
    block_name: appConfig.config.name,
    block_version: versionData.version_number,
  })

  if (error) throw error

  const zipFileData = readFileSync(zipFile)

  await axios.put(preSignedData.url, zipFileData, {
    headers: {
      'Content-Type': 'application/zip',
    },
  })

  const { supportedAppblockVersions } = appConfig.config
  if (!supportedAppblockVersions) {
    throw new Error(`Please set-appblock-version and try again`)
  }

  // ========= languageVersion ========================
  const { languageVersionIds } = await getLanguageVersionData({ supportedAppblockVersions })

  const reqBody = {
    block_id: pkBlockId,
    source_code_key: preSignedData.key,
    block_version_id: versionData.id,
    appblock_versions: supportedAppblockVersions,
    language_version_ids: languageVersionIds,
  }

  spinnies.add('p1', { text: 'Publishing package block' })
  const { error: pubErr } = await post(publishBlockApi, reqBody)
  if (pubErr) throw pubErr

  spinnies.succeed('p1', { text: 'Successfully published package block' })
}

module.exports = { publishPackageBlock }
