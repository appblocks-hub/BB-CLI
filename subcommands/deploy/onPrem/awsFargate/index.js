/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/* eslint-disable prefer-const */
const { ecsHandler } = require('../../../../utils/aws/ecs')
const { elbHandler } = require('../../../../utils/aws/elb')
const { aasHandler } = require('../../../../utils/aws/aas')
const { spinnies } = require('../../../../loader')

const awsFargateDeploy = async ({ appData, envData, deployConfigManager, config }) => {
  const deployedData = config.deployed

  try {
    const { app_id: appId, app_name: appName } = appData
    const { environment_id: envId, environment_name: envName } = envData

    // const { autoScaleAllowed } = awsHandler.getAWSFargateDeploymentConfig
    const fargateDeploymentDNS = []

    const containerExitingData = deployedData.aws_ecr
    const { repositoryUri, repositoryName, port } = containerExitingData
    const name = repositoryName
    const deploymentName = config.name

    spinnies.add(`fargateDep`, { text: `Setting up deployment for ${deploymentName}` })
    let containerData = { ...containerExitingData, container_name: name, app_id: appId, environment_id: envId }

    if (!repositoryUri || !repositoryName) return

    const fargateConfig = config.aws_fargate
    const options = { appId, appName, envId, envName, containerName: name, containerData, fargateConfig }

    let {
      clusterArn,
      loadBalancerArn,
      targetGroupArn,
      taskDefinitionArn,
      autoScalingPolicyArn,
      autoScalableTargetResourceId,
      serviceArn,
      serviceName,
      clusterName,
      listenerArn,
    } = deployedData

    let dnsName = deployedData.server_dns

    if (!clusterArn) {
      spinnies.update(`fargateDep`, { text: `Creating cluster for ${name}` })
      const clusterData = await ecsHandler.createCluster(options)
      clusterArn = clusterData.cluster.clusterArn
      clusterName = clusterData.cluster.clusterName
      deployedData.clusterArn = clusterArn
      deployedData.clusterName = clusterName
    }

    if (!taskDefinitionArn) {
      spinnies.update(`fargateDep`, { text: `Registering task definition for ${name}` })
      const tdData = await ecsHandler.registerTaskDefinition({
        ...options,
        repositoryUri,
        repositoryName,
        port,
      })
      taskDefinitionArn = tdData.taskDefinition.taskDefinitionArn
      deployedData.taskDefinitionArn = taskDefinitionArn
    }

    if (!targetGroupArn) {
      spinnies.update(`fargateDep`, { text: `Creating target group for ${name}` })
      const targetGroupData = await elbHandler.createTargetGroup({ ...options, port })
      targetGroupArn = targetGroupData.TargetGroup.TargetGroupArn
      deployedData.targetGroupArn = targetGroupArn
    }

    if (!loadBalancerArn) {
      spinnies.update(`fargateDep`, { text: `Creating load balancer for ${name}` })
      const lbData = await elbHandler.createLoadBalancer(options)
      loadBalancerArn = lbData.LoadBalancer.LoadBalancerArn
      dnsName = `http://${lbData.LoadBalancer.DNSName}`
      deployedData.loadBalancerArn = loadBalancerArn
      deployedData.server_dns = dnsName
    }

    if (!listenerArn) {
      spinnies.update(`fargateDep`, { text: `Creating load balancer listener for ${name}` })
      const { Listener } = await elbHandler.createLoadBalancerListener({
        ...options,
        targetGroupArn,
        loadBalancerArn,
        port,
      })
      deployedData.listenerArn = Listener.ListenerArn
    }

    const loadBalancers = [
      {
        targetGroupArn,
        containerName: repositoryName,
        containerPort: port,
      },
    ]

    if (!serviceArn) {
      spinnies.update(`fargateDep`, { text: `Creating service for ${name}` })
      const serviceData = await ecsHandler.createService({
        ...options,
        clusterArn,
        taskDefinitionArn,
        loadBalancers,
      })
      serviceArn = serviceData.service.serviceArn
      deployedData.serviceArn = serviceArn
      serviceName = serviceData.service.serviceName
      deployedData.serviceName = serviceName
    } else {
      spinnies.update(`fargateDep`, { text: `Updating service for ${name}` })
      await ecsHandler.updateService({ clusterArn, serviceName, fargateConfig })
    }

    // if (autoScaleAllowed) {
    if (!autoScalableTargetResourceId) {
      spinnies.update(`fargateDep`, { text: `Registering scalable target for ${name}` })
      const scalableTargetData = await aasHandler.registerScalableTarget({ clusterName, serviceName, fargateConfig })
      deployedData.autoScalableTargetResourceId = scalableTargetData.ResourceId
    }
    if (!autoScalingPolicyArn) {
      spinnies.update(`fargateDep`, { text: `Creating scaling policy for ${name}` })
      const scalePolicyData = await aasHandler.putScalingPolicy({ clusterName, serviceName, fargateConfig })
      deployedData.autoScalingPolicyArn = scalePolicyData.PolicyARN
    }
    // }

    spinnies.update(`fargateDep`, { text: `Saving container data for ${name}` })

    fargateDeploymentDNS.push({
      name: deploymentName,
      container: name,
      load_balancer_dns: dnsName,
    })

    spinnies.succeed(`fargateDep`, {
      text: `${name} container deployed successfully.\n  Visit ${dnsName} to access the container app. \n  (Note: It may take few minutes to be provisioned.)`,
    })

    const onPremEnvData = envData.on_premise || {}
    const onPremBackendEnv = onPremEnvData.backend || {}
    const existingFargateData = onPremBackendEnv?.aws_fargate || []
    onPremBackendEnv.aws_fargate = [...existingFargateData, ...fargateDeploymentDNS]

    const newEnvData = {
      ...envData,
      on_premise: {
        ...onPremEnvData,
        backend: onPremBackendEnv,
      },
    }

    // eslint-disable-next-line no-param-reassign
    deployConfigManager.upsertDeployConfig = {
      name: 'environments',
      data: {
        ...appData.environments,
        [envName]: newEnvData,
      },
    }
    deployedData.newUploads = false
    await deployConfigManager.writeOnPremDeployedConfig({ config: deployedData, name: config.name })
  } catch (error) {
    await deployConfigManager.writeOnPremDeployedConfig({ config: deployedData, name: config.name })
    spinnies.add('fargateDep')
    spinnies.fail('fargateDep', { text: `Error deploying: ${error.message}` })
  }
}

module.exports = awsFargateDeploy
