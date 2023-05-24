/* eslint-disable prefer-const */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { domainRegex } = require('../../../utils')
const { readInput } = require('../../../utils/questionPrompts')
const { getAWSECRConfig } = require('../../upload/onPrem/awsECR/util')
const { getAWSS3Config } = require('../../upload/onPrem/awsS3/util')
const { getAWSFargateConfig } = require('./awsFargate/util')
const { getAWSStaticHostConfig } = require('./awsStaticWeb/util')
const { appConfig: abConfig } = require('../../../utils/appconfigStore')
const { getBBConfig } = require('../../../utils/config-manager')

const getDeploymentServiceChoices = (type) => {
  switch (type) {
    case 'view':
      return [{ name: 'AWS STATIC WEB HOSTING', value: 'aws_static_web_hosting' }]
    case 'function':
      return [{ name: 'AWS FARGATE', value: 'aws_fargate' }]
    default:
      return []
  }
}

const getUploadServiceChoices = (type) => {
  switch (type) {
    case 'view':
      return [{ name: 'AWS S3', value: 'aws_s3' }]
    case 'function':
      return [{ name: 'AWS ECR', value: 'aws_ecr' }]
    default:
      return []
  }
}

const getUploadServiceConfig = async (options) => {
  switch (options.uploadService) {
    case 'aws_s3':
      return getAWSS3Config(options)
    case 'aws_ecr':
      return getAWSECRConfig(options)
    default:
      return {}
  }
}

const getDeployServiceConfig = async (options) => {
  switch (options.deployService) {
    case 'aws_static_web_hosting':
      return getAWSStaticHostConfig(options)
    case 'aws_fargate':
      return getAWSFargateConfig(options)
    default:
      return {}
  }
}

const getOnPremConfigDetails = async (options) => {
  await abConfig.init()

  let {
    opdName,
    upService,
    opdDomain,
    opdEleDomain,
    blocks,
    dpService,
    blockType,
    sBDeployment,
    appData,
    envData,
    existingConfigNames,
  } = options || {}

  const envName = envData.environment_name
  const appName = appData.app_name

  if (!blockType) {
    blockType = await readInput({
      type: 'list',
      name: 'blockType',
      message: 'Select the block type',
      choices: [
        { name: 'View', value: 'view' },
        { name: 'Function', value: 'function' },
      ],
      default: 0,
    })
  }

  if (!upService) {
    const choices = getUploadServiceChoices(blockType)
    upService = await readInput({
      type: 'list',
      name: 'upService',
      message: 'Select the upload service',
      choices,
      default: 'aws_s3',
    })
  }

  if (!dpService) {
    const choices = getDeploymentServiceChoices(blockType)
    dpService = await readInput({
      type: 'list',
      name: 'dpService',
      message: 'Select the deploy service',
      choices,
      default: 'aws_static_web_hosting',
    })
  }

  if (!opdName) {
    opdName = await readInput({
      name: 'opdName',
      message: 'Enter a name for deployment',
      default: `${appName}_${envName}_${blockType}_${upService}_${dpService}`,
      validate: (input) => {
        if (!input || input.length < 3) return `Invalid input`
        if (existingConfigNames?.includes[input]) return `Name already exists`
        return true
      },
    })
  }

  if (!opdDomain) {
    opdDomain = await readInput({
      name: 'domain',
      message: `Enter domain name of ${blockType === 'function' ? 'functions' : 'views'} deploy`,
      validate: (input) => {
        if (!input) return `Invalid input`
        if (!domainRegex.test(input)) return `Invalid domain name`
        return true
      },
    })
  }

  sBDeployment = await readInput({
    type: 'list',
    name: 'sBDeployment',
    message: 'Select the build process type',
    choices: [
      { name: 'Single Build', value: true },
      { name: 'Normal Build', value: false },
    ],
    default: true,
  })

  if (sBDeployment && !opdEleDomain && blockType === 'view') {
    opdEleDomain = await readInput({
      name: 'domain',
      message: `Enter domain name of views elements deploy (single build)`,
      validate: (input) => {
        if (!input) return `Invalid input`
        if (!domainRegex.test(input)) return `Invalid domain name`
        return true
      },
    })
  }

  if (!sBDeployment && !blocks) {
    const { dependencies } = await getBBConfig()
    const choices =
      blockType === 'view'
        ? Object.values(dependencies)
            .filter((b) => ['ui-container', 'ui-elements', 'ui-dep-lib'].includes(b.meta.type))
            .map((b) => b.meta.name)
        : Object.values(dependencies)
            .filter((b) => ['function', 'shared-fn'].includes(b.meta.type))
            .map((b) => b.meta.name)

    blocks = choices
    // blocks = await readInput({
    //   type: 'checkbox',
    //   name: 'blocks',
    //   message: 'Select the blocks',
    //   choices,
    //   validate: (input) => {
    //     if (!input) return `Invalid input`
    //     return true
    //   },
    //   default: choices,
    // })
  }

  const configData = {
    name: opdName,
    uploadService: upService,
    domain: opdDomain,
    elementsDomain: opdEleDomain,
    blockType,
    appName,
    singleBuildDeployment: sBDeployment,
    deployService: dpService,
    envName,
    blocks,
  }

  console.log(`Reading configuration for ${upService}`)
  const uploadServiceConfig = await getUploadServiceConfig({ serviceName: upService, ...configData })
  console.log(`Reading configuration for ${dpService}`)
  const deployServiceConfig = await getDeployServiceConfig({ serviceName: dpService, ...configData })

  return {
    ...configData,
    [configData.uploadService]: uploadServiceConfig,
    [configData.deployService]: deployServiceConfig,
  }
}

module.exports = {
  getDeploymentServiceChoices,
  getOnPremConfigDetails,
}
