/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const path = require('path')
const { existsSync, writeFileSync, readFileSync } = require('fs')
const singleBuild = require('../../start/singleBuild')
const { appConfig } = require('../../../utils/appconfigStore')
const { s3Handler } = require('../../../utils/aws/s3')
const { spinnies } = require('../../../loader')
const { buildBlock } = require('../../start/util')
const { awsHandler } = require('../../../utils/aws')
const { convertToEnv } = require('../../../utils/env')

const singleBuildDeployment = async ({ deployConfigManager, config, opdBackupFolder, env, backendUrl }) => {
  const deployData = config.deployed
  try {
    await appConfig.init()


    console.log("appconfig for frontend deployment is",appConfig)
    let envPath = path.resolve(`.env.view.${env}`)

    if (!existsSync(envPath)) {
      const { region } = awsHandler.getAWSCredConfig
      const s3Website = `s3-website-${region}.amazonaws.com`
      const eleWebDomain =`http://${envData.elementsBucket}.${s3Website}/remoteEntry.js`

      // const envData = {
      //   BLOCK_ELEMENTS_URL: eleWebDomain,
      //   BLOCK_DEP_LIB_URL: eleWebDomain,
      //   BLOCK_CONTAINER_URL: deployData.server_dns || `http://${deployData.bucket}.${s3Website}`,
      // }

      if (backendUrl) envData.BLOCK_FUNCTION_URL = backendUrl

      envPath = path.resolve(`.env.view`)
      const existingEnvDataFile = await readFileSync(envPath, 'utf-8')
      const updatedEnv = convertToEnv(envData, existingEnvDataFile)
      await writeFileSync(envPath, updatedEnv)
    }

    spinnies.add('ele', { text: `Preparing elements block to upload` })

    const { elementsBuildFolder, containerBlock } = await singleBuild({ appConfig, buildOnly: true, env })

    if (!elementsBuildFolder) throw new Error('Error building elements')

    // if (!deployData.elementsBucket) {
    //   spinnies.update('ele', { text: `Creating elements bucket to upload` })
    //   const { bucket: bucketName } = await s3Handler.createBucket({ bucket: config.elementsDomain })
    //   deployData.elementsBucket = bucketName
    // }

    const uploadKeys = {}

    spinnies.update('ele', { text: `Uploading elements` })
    const uploadedBlocks = await s3Handler.uploadDir({
      bucket: deployData.elementsBucket,
      dirPath: elementsBuildFolder,
      backupPath: path.join(opdBackupFolder, 'elements'),
    })

    uploadKeys.elements = uploadedBlocks
    spinnies.succeed(`ele`, { text: `Uploaded elements successfully` })

    spinnies.add(`cont`, { text: `Building ui container` })

    // Upload Container
    const { blockBuildFolder, error } = await buildBlock(containerBlock, {}, env)

    if (!blockBuildFolder) throw new Error(`Error building ui container ${error}`)

    spinnies.update('cont', { text: `Uploading container` })
    const uploadedContainer = await s3Handler.uploadDir({
      bucket: deployData.bucket,
      dirPath: blockBuildFolder,
      backupPath: path.join(opdBackupFolder, 'container'),
    })
    uploadKeys.container = uploadedContainer

    spinnies.update(`cont`, { text: `Uploaded container successfully` })

    deployData.uploadKeys = uploadKeys
    deployData.newUploads = true

    spinnies.update(`cont`, { text: `Saving ${config.name} details` })
    await deployConfigManager.writeOnPremDeployedConfig({ config: deployData, name: config.name })

    spinnies.succeed(`cont`, { text: `Upload success` })
  } catch (error) {
    spinnies.stopAll()

    spinnies.add(`ups3`)
    spinnies.fail(`ups3`, { text: error?.message })

    deployData.newUploads = false
    await deployConfigManager.writeOnPremDeployedConfig({ config: deployData, name: config.name })
  }
}

module.exports = { singleBuildDeployment }
