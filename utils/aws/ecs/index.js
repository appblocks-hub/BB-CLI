/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  ECSClient,
  CreateClusterCommand,
  CreateServiceCommand,
  RegisterTaskDefinitionCommand,
  UpdateServiceCommand,
} = require('@aws-sdk/client-ecs')
const { awsHandler } = require('..')

class ECS_Handler {
  constructor() {
    this.init()
  }

  init() {
    if (this.ECSClient) return

    const { region, accessKeyId, secretAccessKey } = awsHandler.getAWSCredConfig

    this.ECSClient = new ECSClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  async createCluster(options) {
    const { appId, containerName, minCapacity = 1, maxCapacity = 2 } = options
    const command = new CreateClusterCommand({
      clusterName: `${containerName}Cluster`,
      tags: [{ key: 'appId', value: appId }],
      // settings,
      // configuration,
      capacityProviders: ['FARGATE'],
      defaultCapacityProviderStrategy: [
        {
          base: minCapacity,
          weight: maxCapacity,
          capacityProvider: 'FARGATE',
        },
      ],
    })
    const { cluster } = await this.ECSClient.send(command)

    return { cluster, cluster_data: cluster, cluster_name: cluster.clusterName, cluster_arn: cluster.clusterArn }
  }

  async registerTaskDefinition(options) {
    const { appId, envId, repositoryUri, repositoryName, containerName, port, fargateConfig } = options
    const { cpu, memory } = fargateConfig || {}

    const command = new RegisterTaskDefinitionCommand({
      family: `${containerName}TD`,
      containerDefinitions: [
        {
          name: repositoryName,
          image: `${repositoryUri}:latest`,
          portMappings: [
            {
              containerPort: port,
              hostPort: port,
              protocol: 'TCP',
            },
          ],
        },
      ],
      executionRoleArn: 'ecsTaskExecutionRole',
      cpu,
      memory,
      networkMode: 'awsvpc',
      requiresCompatibilities: ['FARGATE'],
      runtimePlatform: {
        cpuArchitecture: 'X86_64',
        operatingSystemFamily: 'LINUX',
      },
      tags: [
        { key: 'envId', value: envId },
        { key: 'appId', value: appId },
      ],
    })
    const { taskDefinition } = await this.ECSClient.send(command)
    return {
      taskDefinition,
      task_definition_arn: taskDefinition.taskDefinitionArn,
      task_definition_family: taskDefinition.family,
      task_definition_data: taskDefinition,
    }
  }

  async createService(options) {
    const { appId, envId, containerName, clusterArn, taskDefinitionArn, loadBalancers, fargateConfig } = options
    const { subnetIds, securityGroupIds, desiredCount } = fargateConfig

    const command = new CreateServiceCommand({
      serviceName: `${containerName}Service`,
      tags: [
        { key: 'appId', value: appId },
        { key: 'envId', value: envId },

        { key: 'cluster', value: clusterArn.split('/')[1] },
        { key: 'taskDefinition', value: taskDefinitionArn.split('/')[1] },
      ],
      cluster: clusterArn,
      taskDefinition: taskDefinitionArn,
      desiredCount,
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: subnetIds,
          securityGroups: securityGroupIds,
          assignPublicIp: 'ENABLED',
        },
      },
      loadBalancers,
    })
    const { service } = await this.ECSClient.send(command)

    // await waitUntilServicesStable(
    //   { client: this.ECSClient, maxWaitTime: 60 },
    //   {
    //     cluster: clusterArn,
    //     services: [service.serviceName],
    //   }
    // )

    return { service, service_data: service, service_name: service.serviceName, service_arn: service.serviceArn }
  }

  async updateService(options) {
    const { clusterArn, serviceName } = options

    const command = new UpdateServiceCommand({
      service: serviceName,
      cluster: clusterArn,
      forceNewDeployment: true,
    })
    const { service } = await this.ECSClient.send(command)
    return { service, service_data: service, service_name: service.serviceName, service_arn: service.serviceArn }
  }
}

const ecsHandler = new ECS_Handler()
module.exports = { ECS_Handler, ecsHandler }
