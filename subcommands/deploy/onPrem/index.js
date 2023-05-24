/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const { logFail } = require('../../../utils')
const { awsHandler } = require('../../../utils/aws')
const { readInput } = require('../../../utils/questionPrompts')
const awsFargateDeploy = require('./awsFargate')
const awsStaticWebDeploy = require('./awsStaticWeb')

const onPremDeploy = async (options) => {
  const { appData, deployConfigManager, argOptions } = options

  await awsHandler.syncAWSConfig()

  const deployedData = deployConfigManager.readOnPremDeployedConfig

  let config
  let deployed

  if (argOptions.configName) {
    config = await deployConfigManager.readOnPremDeployConfig[argOptions.configName]
    if (!config?.name) throw new Error(`No on-premise configuration found with name ${argOptions.configName}`)
    deployed = deployedData[argOptions.configName]
    config.deployed = deployed
    if (!config.deployed.newUploads) throw new Error(`No new uploads found for deployment`)
  } else {
    const choices = Object.values(deployedData)
      .filter((d) => d.newUploads)
      .map((d) => ({ name: d.name, value: d }))

    if (!choices.length) {
      logFail(`No uploads for deploy. Please upload and try again\n`)
      process.exit(1)
    }

    deployed = await readInput({
      type: 'list',
      name: 'config',
      message: 'Select deployment configuration name to deploy',
      choices,
    })
    config = await deployConfigManager.readOnPremDeployConfig[deployed.name]

    if (!config?.name) {
      throw new Error(`Error getting configuration for ${deployed.name}\n`)
    }

    config.deployed = deployed
  }

  const envData = appData.environments[config.envName]
  envData.environment_name = config.envName

  if (!envData.environment_id) {
    logFail(`No environment not exist with id ${config.environment_id}\n`)
    process.exit(1)
  }

  const { deployService } = config

  switch (deployService) {
    case 'aws_fargate':
      await awsFargateDeploy({ ...options, envData, config })
      break

    case 'aws_static_web_hosting':
      await awsStaticWebDeploy({ ...options, envData, config })
      break

    default:
      logFail(`${deployService} deploy service not supported\n`)
      process.exit(1)
      break
  }
}

module.exports = onPremDeploy
