/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { awsHandler } = require('../../../utils/aws')
const { readInput } = require('../../../utils/questionPrompts')
const deployConfigManager = require('../../deploy/manager')
const onPremECRUpload = require('./awsECR')
const onPremS3Upload = require('./awsS3')

const onPremUpload = async (options) => {
  deployConfigManager.init()

  await awsHandler.syncAWSConfig()

  const OPDConfig = await deployConfigManager.syncOnPremDeploymentConfig(options)
  const OPDNames = Object.keys(OPDConfig)

  const choices = OPDNames.map((name) => ({ name, value: OPDConfig[name] }))

  choices.unshift({
    name: 'Create new deployment configuration',
    value: null,
  })

  let config = await readInput({
    type: 'list',
    name: 'config',
    message: 'Select upload to existing deploy config',
    choices,
  })

  if (!config) {
    config = await deployConfigManager.createOnPremDeploymentConfig({ ...options, existingConfigNames: OPDNames })
  }

  config.deployed = await deployConfigManager.readOnPremDeployedConfig[config.name]

  const { uploadService } = config
  switch (uploadService) {
    case 'aws_s3':
      await onPremS3Upload({ ...options, config, deployConfigManager })
      break
    case 'aws_ecr':
      await onPremECRUpload({ ...options, config, deployConfigManager })
      break
    default:
      console.log('service not supported')
      break
  }
}

module.exports = onPremUpload
