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
  const { appData, deployConfigManager } = options

  await awsHandler.syncAWSConfig()

  const deployedData = deployConfigManager.readOnPremDeployedConfig

  const choices = Object.values(deployedData)
    .filter((d) => d.newUploads)
    .map((d) => ({ name: d.name, value: d }))

  if (!choices.length) {
    logFail(`No uploads for deploy. Please upload and try again\n`)
    process.exit(1)
  }

  const deployed = await readInput({
    type: 'list',
    name: 'config',
    message: 'Select deployment configuration name to deploy',
    choices,
  })
  const config = await deployConfigManager.readOnPremDeployConfig[deployed.name]
  config.deployed = deployed

  const envData = appData.environments[config.envName]
  envData.environment_name = config.envName

  if (!envData.environment_id) {
    logFail(`No environment not exist with id ${config.environment_id}\n`)
    process.exit(1)
  }

  if (!config) {
    logFail(`Error getting configuration for ${deployed.name}\n`)
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
