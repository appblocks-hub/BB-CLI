/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { ECRClient, CreateRepositoryCommand, GetAuthorizationTokenCommand } = require('@aws-sdk/client-ecr')
const { execSync } = require('child_process')
const { awsHandler } = require('..')
const { spinnies } = require('../../../loader')
const { runBash } = require('../../../subcommands/bash')

class ECR_Handler {
  constructor() {
    this.init()
  }

  init() {
    const { region, accessKeyId, secretAccessKey } = awsHandler.getAWSCredConfig

    this.ECRClient = new ECRClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  async createRepository(options) {
    const { envId, appId, name, port } = options

    const input = {
      repositoryName: name,
      tags: [
        { Key: 'envId', Value: envId },
        { Key: 'appId', Value: appId },
      ],
    }

    try {
      const command = new CreateRepositoryCommand(input)
      const { repository } = await this.ECRClient.send(command)
      const { registryId, repositoryArn, repositoryUri, repositoryName } = repository
      return { registryId, repositoryArn, repositoryUri, repositoryName, port }
    } catch (error) {
      return { error }
    }
  }

  async getECRAuthToken(registryIds) {
    const input = {
      registryIds,
    }
    const command = new GetAuthorizationTokenCommand(input)
    const response = await this.ECRClient.send(command)

    const [token] = response.authorizationData
    return Buffer.from(token.authorizationToken, 'base64').toString().replace('AWS:', '')
  }

  async uploadImage(options) {
    spinnies.add('upimg', { text: 'Preparing image container registry' })
    try {
      const { container, ecrData, backupFolder } = options
      const containerName = container.name

      const registryIds = [ecrData.registryId]
      spinnies.update('upimg', { text: `Preparing image upload token` })
      const ecrAuthToken = await this.getECRAuthToken(registryIds)

      const { repositoryUri } = ecrData

      spinnies.update('upimg', { text: `Preparing docker` })
      await execSync(`echo "${ecrAuthToken}" | docker login --username AWS --password-stdin ${repositoryUri}`)
      spinnies.update('upimg', { text: `Building docker image for ${containerName}` })
      await execSync(`docker build -t ${containerName} .`, { stdio: 'inherit' })
      spinnies.update('upimg', { text: `Adding tags to docker image for ${containerName}` })

      await execSync(`docker tag ${containerName}:latest ${repositoryUri}:latest`, { stdio: 'inherit' })
      spinnies.update('upimg', { text: `Uploading docker image for ${containerName}` })
      await execSync(`docker push ${repositoryUri}:latest`, { stdio: 'inherit' })

      if (backupFolder) {
        spinnies.update('upimg', { text: `Saving docker image for ${containerName}` })
        await execSync(`docker save ${containerName} > ${backupFolder}/${containerName}.tar`)
      }

      await runBash('rm -rf ./._ab_em && rm ./Dockerfile && rm .dockerignore')
      await runBash('rm ./package.json && rm ./package-lock.json')
      spinnies.succeed('upimg', { text: `Image uploads completed successfully` })
      return { uploaded: true }
    } catch (error) {
      spinnies.fail('upimg', { text: 'Image uploads failed' })
      return { uploaded: false, error }
    }
  }
}

const ecrHandler = new ECR_Handler()
module.exports = { ECR_Handler, ecrHandler }
