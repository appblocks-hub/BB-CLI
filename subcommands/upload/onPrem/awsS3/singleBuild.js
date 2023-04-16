/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const path = require('path')
const singleBuild = require('../../../start/singleBuild')
const { appConfig } = require('../../../../utils/appconfigStore')
const { s3Handler } = require('../../../../utils/aws/s3')
const { spinnies } = require('../../../../loader')
const { buildBlock } = require('../../../start/util')
const { removeSync } = require('./util')
const { awsHandler } = require('../../../../utils/aws')

const singleBuildDeployment = async ({ deployConfigManager, deployedData, config, opdBackupFolder, env }) => {
  const delPaths = []
  const deployData = deployedData
  try {
    await appConfig.init()
    spinnies.add('ele', { text: `Preparing elements block to upload` })

    const { elementsBuildFolder, emEleFolder, containerBlock } = await singleBuild({ appConfig, buildOnly: true, env })
    delPaths.push(emEleFolder)

    if (!elementsBuildFolder) throw new Error('Error building elements')

    if (!deployData.elementsBucket) {
      spinnies.update('ele', { text: `Creating elements bucket to upload` })
      const { bucket: bucketName } = await s3Handler.createBucket({ bucket: config.elementsDomain })
      deployData.elementsBucket = bucketName
    }

    const uploadKeys = {}

    spinnies.update('ele', { text: `Uploading elements` })
    const uploadedBlocks = await s3Handler.uploadDir({
      bucket: deployData.elementsBucket,
      dirPath: elementsBuildFolder,
      backupPath: path.join(opdBackupFolder, 'elements'),
    })

    uploadKeys.elements = uploadedBlocks
    spinnies.succeed(`ele`, { text: `Uploaded elements successfully` })

    const { region } = awsHandler.getAWSCredConfig

    spinnies.add(`cont`, { text: `Building container` })

    // Upload Container
    const { blockBuildFolder , error} = await buildBlock(
      containerBlock,
      {
        BLOCK_ELEMENTS_URL: `http://${deployData.elementsBucket}.s3-website-${region}.amazonaws.com/remoteEntry.js`,
      },
      env
    )

    delPaths.push(blockBuildFolder)

    if (!blockBuildFolder) throw new Error(`Error building container ${error}`)

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

    await removeSync(delPaths)
  } catch (error) {
    spinnies.stopAll()

    spinnies.add(`ups3`)
    spinnies.fail(`ups3`, { text: error?.message })

    deployData.newUploads = false
    await deployConfigManager.writeOnPremDeployedConfig({ config: deployData, name: config.name })
    await removeSync(delPaths)
  }
}

module.exports = { singleBuildDeployment }
