/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../../../loader')
const { ecrHandler } = require('../../../../utils/aws/ecr')
const { getBBConfig } = require('../../../../utils/config-manager')
const { copyEmulatorCode } = require('../../../../utils/emulator-manager')
const { generateRootPackageJsonFile, generateDockerFile, beSingleBuildDeployment } = require('./util')

const onPremECRUpload = async (options) => {
  const { appData, envData, config, deployConfigManager } = options
  const deployedData = config.deployed || {}
  deployedData.name = config.name

  try {
    const { app_id: appId, app_name: appName } = appData
    const { environment_id: envId, environment_name: envName } = envData

    const container = {
      // eslint-disable-next-line no-useless-escape
      name: config.aws_ecr.container,
      port: 80,
    }

    const onPremDeployContentBackupFolder = deployConfigManager.getOnPremDeployContentBackupFolder({
      suffix: '/backend/container',
    })

    let ecrData = deployedData.aws_ecr

    let { dependencies } = await getBBConfig()
    if (!config.blocks) {
      config.blocks = Object.values(dependencies)
        .filter((b) => ['function', 'shared-fn'].includes(b.meta.type))
        .map((b) => b.meta.name)
    }

    dependencies = Object.values(dependencies).filter((d) => config.blocks.includes(d.meta.name))

    const container_ports = [container.port]
    if (config.singleBuildDeployment) {
      await beSingleBuildDeployment({ container_ports, dependencies, appName, config, env: envName })
    } else {
      await copyEmulatorCode(container_ports, dependencies)
      generateRootPackageJsonFile({ appName, dependencies })
      generateDockerFile({ ports: container_ports, dependencies, envName })
    }

    if (!ecrData?.repositoryUri) {
      spinnies.add('ecrup', { text: `Creating image container registry for ${container.name}` })
      ecrData = await ecrHandler.createRepository({
        appId,
        envId,
        name: container.name,
        port: container.port,
      })

      if (ecrData.error) throw ecrData.error

      deployedData.aws_ecr = ecrData
      spinnies.remove(`ecrup`)
    }

    const { error } = await ecrHandler.uploadImage({
      container,
      ecrData,
      backupFolder: onPremDeployContentBackupFolder,
    })

    if (error) throw error

    spinnies.add(`ecrup`, { text: `Saving ${config.name} details` })
    deployedData.newUploads = true
    await deployConfigManager.writeOnPremDeployedConfig({ config: deployedData, name: config.name })
    spinnies.succeed(`ecrup`, { text: `Uploaded ${config.name} successfully` })
  } catch (error) {
    console.log(error)
    deployedData.newUploads = false
    await deployConfigManager.writeOnPremDeployedConfig({ config: deployedData, name: config.name })
    spinnies.add('ecrup')
    spinnies.fail('ecrup', { text: `Error: ${error.message || error}` })
  }
}

module.exports = onPremECRUpload
