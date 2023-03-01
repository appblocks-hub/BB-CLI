/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../../../loader')
const { s3Handler } = require('../../../../utils/aws/s3')

const awsStaticWebDeploy = async (options) => {
  try {
    const { config, appData, envData, deployConfigManager } = options
    const deployedData = config.deployed

    spinnies.add(`s3Dep`, { text: `Deploying ${config.name} details` })
    if (!deployedData.server_dns) {
      const { bucket } = config.aws_s3
      await s3Handler.putBucketPolicy({ bucket })
      const { static_host } = await s3Handler.putBucketWebsite({ bucket })
      deployedData.server_dns = static_host
      deployedData.bucket = bucket

      const onPremEnvData = envData.on_premise || {}
      const onPremBackendEnv = onPremEnvData.frontend || {}
      const existingS3Data = onPremBackendEnv?.aws_static_web_hosting || []
      onPremBackendEnv.aws_static_web_hosting = Array.from(
        new Set(
          [
            ...existingS3Data,
            {
              name: config.name,
              bucket,
              static_host,
            },
          ].map(JSON.stringify)
        )
      ).map(JSON.parse)

      const newEnvData = {
        ...envData,
        on_premise: {
          ...onPremEnvData,
          frontend: onPremBackendEnv,
        },
      }

      deployConfigManager.upsertDeployConfig = {
        name: 'environments',
        data: {
          ...appData.environments,
          [envData.environment_name]: newEnvData,
        },
      }
    }

    deployedData.newUploads = false
    await deployConfigManager.writeOnPremDeployedConfig({ config: deployedData, name: config.name })

    spinnies.succeed(`s3Dep`, {
      text: `${config.name} deployed successfully. Visit ${deployedData.server_dns} to access.`,
    })
  } catch (error) {
    spinnies.add(`s3Dep`)
    spinnies.succeed(`s3Dep`, { text: `Error: ${error.message || error}` })
  }
}

module.exports = awsStaticWebDeploy
