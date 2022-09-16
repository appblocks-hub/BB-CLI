/* eslint-disable no-continue */

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { rm } = require('fs')
const path = require('path')
const chalk = require('chalk')
const { default: axios } = require('axios')
const { createZip, uploadToServer } = require('../utils/uploadUtil')
const { getBBConfig } = require('../utils/config-manager')
const { appRegistryUploadBlockStatus, appRegistryCheckAppEnvExist } = require('../utils/api')
const { getShieldHeader } = require('../utils/getHeaders')
const deployConfig = require('../utils/deployConfig-manager')
const { spinnies } = require('../loader')
const { getPublishedVersion } = require('./publish')
const { appConfig } = require('../utils/appconfigStore')

const logFail = (msg) => console.log(chalk.red(msg))

const appPublish = async () => {
  deployConfig.init()
  appConfig.init()

  const { dependencies } = await getBBConfig()
  const appData = deployConfig.deployAppConfig
  const appId = appData.app_id

  if (!appId) {
    logFail(`\nPlease create app before publish..`)
    process.exit(1)
  }

  const environment = 'Production'
  const envData = appData.environments[environment]

  if (!envData) {
    logFail(`${environment} environment not exist. Please create-env and try again\n`)

    const envs = Object.keys(appData.environments)
    if (envs.length) {
      console.log(chalk.gray(`Existing environments are ${envs}\n`))
    }

    process.exit(1)
  }

  const preparedForUpload = []
  const uploadStatus = []

  spinnies.add('up', { text: `Checking app details` })

  // Check if app and env exist in server
  try {
    const { data: resData } = await axios.post(
      `${appRegistryCheckAppEnvExist}`,
      {
        app_id: appId,
        environment_id: envData.environment_id,
      },
      {
        headers: getShieldHeader(),
      }
    )

    const { data } = resData

    if (!data.app_exist || !data.env_exist) {
      const dpath = path.resolve(deployConfig.configName)
      spinnies.fail('up', { text: ` ${!data.app_exist ? 'App' : 'Environment'} does not exist` })
      rm(dpath, () => {
        process.exit(1)
      })
    }
  } catch (error) {
    console.log(error)
    spinnies.fail('up', { text: 'Error checking app data' })
    process.exit(1)
  }

  /**
   * UPLOAD ALL Block
   */
  spinnies.add('up', { text: `Uploading ${'all'} block` })

  for (const blockData of Object.values(dependencies)) {
    const {
      meta: { type, name },
      directory,
    } = blockData

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

    const blockId = await appConfig.getBlockId(name)

    if (['ui-container', 'ui-elements'].includes(type)) {
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

    // rm tmp file
    rm(path.resolve('./.tmp'), { recursive: true }, () => {})

    spinnies.succeed('up', {
      text: `App uploaded successfully. ID : ${deploy_id} `,
    })
  } catch (error) {
    // rm tmp file
    rm(path.resolve('./.tmp'), { recursive: true }, () => {})

    spinnies.fail('up', { text: 'Error saving upload block' })
  }
}

module.exports = appPublish
