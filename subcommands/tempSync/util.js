/* eslint-disable arrow-body-style */
/* eslint-disable no-async-promise-executor */

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { readFileSync, existsSync, mkdirSync } = require('fs')
const { execSync } = require('child_process')
const chalk = require('chalk')
const path = require('path')
const { axios } = require('../../utils/axiosInstances')
const { appRegistryCreateDeployPresignedUrl, appRegistryCheckAppEnvExist } = require('../../utils/api')
const { getShieldHeader } = require('../../utils/getHeaders')
const { blockTypeInverter } = require('../../utils/blockTypeInverter')
const { spinnies } = require('../../loader')
const { logFail } = require('../../utils')
const { getBBFolderPath, BB_FOLDERS, BB_FILES } = require('../../utils/bbFolders')

const bbTempPath = getBBFolderPath(BB_FOLDERS.TEMP)
const ZIP_TEMP_FOLDER = path.join(bbTempPath, BB_FILES.UPLOAD)
const EXCLUDE_IN_ZIP = ['node_modules', '.git'].reduce((acc, ele) => `${acc} -x '${ele}/*'`, '')

const uploadToServer = ({ blockType, blockId, appId, blockName, zipFile, version, blockFolder, environmentId }) => {
  return new Promise(async (resolve) => {
    try {
      spinnies.update('up', { text: `Uploaded ${blockName} successfully` })
      const preSignedData = await axios.post(
        appRegistryCreateDeployPresignedUrl,
        {
          app_id: appId,
          block_type: blockType,
          block_folder: blockFolder,
          block_id: blockId,
          block_name: blockName,
          block_version: version,
          environment_id: environmentId,
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

      spinnies.update('up', { text: `Uploaded ${blockName} successfully` })
      resolve({
        block_version: version,
        block_id: blockId,
        object_key: preSignedData.data.key,
        block_type: blockTypeInverter(blockType),
      })
    } catch (err) {
      resolve({
        block_version: version,
        block_id: blockId,
        block_type: blockTypeInverter(blockType),
        success: false,
      })
    }
  })
}

const checkIfDistExist = (folder, blockName) => {
  if (!existsSync(`${folder}/dist`)) {
    console.log(chalk.red(`\nNo dist folder found in ${blockName}. Please build the ${blockName} app and try again`))
    process.exit(1)
  }
  return true
}

const createZip = async ({ directory, blockName, type }) => {
  let dir = `${directory}`

  if (['ui-container', 'ui-elements'].includes(type)) {
    dir = path.resolve(`${directory}/dist`)
    checkIfDistExist(directory, blockName)
  }

  const zipFile = `${ZIP_TEMP_FOLDER}/${dir.replace(/[^/]*$/, blockName)}.zip`
  const zipDir = `${ZIP_TEMP_FOLDER}/${dir.substring(0, dir.lastIndexOf('/'))}`

  mkdirSync(zipDir, { recursive: true })

  await execSync(`cd ${dir} && zip -r ${zipFile} . ${EXCLUDE_IN_ZIP}`)

  return zipFile
}

const checkIfAppAndEnvExist = async ({ appData, environment }) => {
  const envData = appData.environments[environment]
  envData.environment_name = environment
  if (!envData) {
    logFail(`${environment} environment not exist. Please create-env and try again\n`)

    const envs = Object.keys(appData.environments)
    if (envs.length) {
      console.log(chalk.gray(`Existing environments are ${envs}\n`))
    }

    process.exit(1)
  }

  spinnies.add('up', { text: `Checking app details` })

  // Check if app and env exist in server
  try {
    const { data } = await axios.post(
      appRegistryCheckAppEnvExist,
      {
        app_id: appData.app_id,
        environment_id: envData.environment_id,
      },
      {
        headers: getShieldHeader(),
      }
    )

    const resData = data.data

    if (!resData) throw new Error(`Invalid response`)

    if (!resData.app_exist || !resData.env_exist) {
      spinnies.fail('up', { text: ` ${!resData.app_exist ? 'App' : 'Environment'} does not exist` })
    }
  } catch (error) {
    console.log(error)
    spinnies.fail('up', { text: 'Error checking app data' })
    process.exit(1)
  }
  spinnies.remove('up')
  return envData
}

module.exports = {
  checkIfAppAndEnvExist,
  checkIfDistExist,
  uploadToServer,
  createZip,
}
