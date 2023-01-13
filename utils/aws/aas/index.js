/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  ApplicationAutoScalingClient,
  RegisterScalableTargetCommand,
  PutScalingPolicyCommand,
} = require('@aws-sdk/client-application-auto-scaling')
const { awsHandler } = require('..')

class AAS_Handler {
  // constructor() {
  //   this.init()
  // }

  init() {
    if (this.AASClient) return
    const { region, accessKeyId, secretAccessKey } = awsHandler.getAWSCredConfig

    this.AASClient = new ApplicationAutoScalingClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  async registerScalableTarget(options) {
    this.init()
    const { clusterName, serviceName, fargateConfig } = options
    const { maxCapacity, minCapacity } = fargateConfig
    const ResourceId = `service/${clusterName}/${serviceName}`

    const command = new RegisterScalableTargetCommand({
      MaxCapacity: maxCapacity,
      MinCapacity: minCapacity,
      ResourceId,
      ScalableDimension: 'ecs:service:DesiredCount',
      ServiceNamespace: 'ecs',
      // SuspendedState: {
      //   DynamicScalingInSuspended: false,
      //   DynamicScalingOutSuspended: false,
      //   ScheduledScalingSuspended: false,
      // },
    })
    await this.AASClient.send(command)
    return { ResourceId }
  }

  async putScalingPolicy(options) {
    this.init()
    const { clusterName, serviceName } = options

    const command = new PutScalingPolicyCommand({
      PolicyName: `${serviceName}Policy`,
      ServiceNamespace: 'ecs',
      ResourceId: `service/${clusterName}/${serviceName}`,
      ScalableDimension: 'ecs:service:DesiredCount',
      PolicyType: 'TargetTrackingScaling',
      TargetTrackingScalingPolicyConfiguration: {
        TargetValue: 70,
        PredefinedMetricSpecification: {
          PredefinedMetricType: 'ECSServiceAverageCPUUtilization',
          // ALBRequestCountPerTarget (ResourceLabel should be added)
          // ECSServiceAverageCPUUtilization
          // ECSServiceAverageMemoryUtilization
        },
        // ScaleOutCooldown: 300,
        // ScaleInCooldown: 300,
        // DisableScaleIn: false,
      },
    })
    const { PolicyARN, Alarms } = await this.AASClient.send(command)
    return { PolicyARN, auto_scaling_policy_arn: PolicyARN, Alarms }
  }
}

const aasHandler = new AAS_Handler()
module.exports = { AAS_Handler, aasHandler }
