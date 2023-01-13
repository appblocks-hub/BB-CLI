/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-continue */

const { rm } = require('fs')
const path = require('path')
const chalk = require('chalk')
const { default: axios } = require('axios')
const { getBlockId } = require('../../deploy/util')
const { createZip, uploadToServer } = require('../util')
const { appRegistryUploadBlockStatus } = require('../../../utils/api')
const { getShieldHeader } = require('../../../utils/getHeaders')
const deployConfig = require('../../deploy/manager')
const { spinnies } = require('../../../loader')
const { getPublishedVersion } = require('../../publish/util')
const { logFail } = require('../../../utils')
const { blockTypes } = require('../../../utils/blockTypes')
const { getBBConfig } = require('../../../utils/config-manager')

const abPremUpload = async ({ blockName, envData, appData, environment }) => {
  const preparedForUpload = []
  const uploadStatus = []
  const { dependencies } = await getBBConfig()
  const appId = appData.app_id
  const blockTypeNames = blockTypes.map((v) => v[0])
  const isBlockTypeWise = blockTypeNames.includes(blockName)

  if (!blockName || isBlockTypeWise) {
    /**
     * UPLOAD ALL Block
     */
    spinnies.add('up', { text: `Uploading ${blockName || 'all'} block` })

    for (const blockData of Object.values(dependencies)) {
      const {
        meta: { type, name },
        directory,
      } = blockData

      if (isBlockTypeWise && blockName !== type) continue

      spinnies.update('up', { text: `Preparing ${name} block to upload` })

      const { success, latestVersion, msg } = getPublishedVersion(name, directory)

      if (!success || !latestVersion) {
        preparedForUpload.push({
          success: false,
          blockName: name,
          latestVersion,
          directory,
          msg: latestVersion ? msg : `No published version found -> block ${name}`,
        })
        continue
      }

      const blockId = await getBlockId(name)

      if (['ui-container', 'ui-elements'].includes(blockName || type)) {
        const zipFile = await createZip({ directory, blockName: name, type })
        preparedForUpload.push({
          success: true,
          blockType: type,
          blockFolder: directory,
          appId,
          blockId,
          zipFile,
          blockName: name,
          version: latestVersion,
          environmentId: envData.environment_id,
        })
      } else {
        const zipFile = await createZip({ directory, blockName: name })
        preparedForUpload.push({
          success: true,
          blockType: type,
          blockFolder: directory,
          appId,
          blockId,
          zipFile,
          blockName: name,
          version: latestVersion,
          environmentId: envData.environment_id,
        })
      }
    }
  } else {
    /**
     * UPLOAD SINGLE Block
     */
    spinnies.add('up', { text: `Upload ${blockName} block` })

    if (!dependencies[blockName]) {
      logFail(`\n${chalk.italic(blockName)} not found in dependencies`)
      console.log(chalk.gray(`\nList of present blocks:\n${Object.keys(dependencies)}`))
      console.log(chalk.gray(`\nList of blocke types:\n${blockTypeNames}`))
      process.exit(1)
    }

    spinnies.update('up', { text: `Preparing ${blockName} block to upload` })

    const blockId = await getBlockId(blockName)
    const {
      meta: { type },
      directory,
    } = dependencies[blockName]

    const { success, latestVersion, msg } = getPublishedVersion(blockName, directory)
    if (!success || !latestVersion) {
      preparedForUpload.push({
        success: false,
        blockName,
        latestVersion,
        directory,
        msg: latestVersion ? msg : `No published version found -> block ${blockName}`,
      })
    } else {
      const zipFile = await createZip({ directory, blockName, type })
      preparedForUpload.push({
        success: true,
        blockType: type,
        blockFolder: directory,
        appId,
        blockId,
        zipFile,
        blockName,
        version: latestVersion,
        environmentId: envData.environment_id,
      })
    }
  }

  // Check if any block has error
  if (preparedForUpload.some((v) => !v.success)) {
    spinnies.fail('up', { text: 'Error preparing upload block' })
    preparedForUpload.forEach((v) => {
      if (v.msg) logFail(v.msg)
    })
    process.exit(1)
  }

  for (const bData of preparedForUpload) {
    const uploadedRes = await uploadToServer({
      ...bData,
    })
    uploadStatus.push({ ...uploadedRes, blockName: bData.blockName })
  }

  try {
    // TODO handle unsuccessful blocks
    if (uploadStatus.some((v) => v.success === false)) {
      uploadStatus.forEach((v) => {
        if (v.msg) logFail(v.msg)
      })
      spinnies.fail('up', { text: 'Error uploading block' })
      return
    }

    spinnies.update('up', { text: `Setting uploaded blocks` })

    const uploadedDataRes = await axios.post(
      appRegistryUploadBlockStatus,
      {
        metadata: {},
        request_blocks: uploadStatus,
        environment_id: envData.environment_id,
        tags: 'tag',
      },
      {
        headers: getShieldHeader(),
      }
    )
    const { deploy_id } = uploadedDataRes.data.data

    const updateAppData = { ...appData }

    const uploads = updateAppData.environments[environment].uploads || {}
    uploads[deploy_id] = uploadStatus.map((up) => up.object_key)
    updateAppData.environments[environment] = {
      ...updateAppData.environments[environment],
      uploads,
    }

    deployConfig.upsertDeployConfig = {
      data: updateAppData,
    }

    // rm tmp file
    rm(path.resolve('./.tmp'), { recursive: true }, () => {})

    spinnies.succeed('up', {
      text: `Uploading completed successfully - ${deploy_id}`,
    })
  } catch (error) {
    spinnies.add('up')
    spinnies.fail('up', { text: 'Error saving upload block' })
  }
}

module.exports = abPremUpload

/**
 * archiver package eg, for zipping
 */
// https://stackoverflow.com/questions/65960979/node-js-archiver-need-syntax-for-excluding-file-types-via-glob
// const fs = require('fs');
// const archiver = require('archiver');
// const output = fs.createWriteStream(__dirname);
// const archive = archiver('zip', { zlib: { level: 9 } });
// archive.pipe(output);
// archive.glob('*/**', {
//    cwd: __dirname,
//    ignore: ['**/node_modules/*', '.git', '*.zip']
// });
// archive.finalize();
