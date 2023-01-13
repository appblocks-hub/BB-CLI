/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  ElasticLoadBalancingV2Client,
  CreateLoadBalancerCommand,
  CreateTargetGroupCommand,
  CreateListenerCommand,
} = require('@aws-sdk/client-elastic-load-balancing-v2')
const { awsHandler } = require('..')

class ELB_Handler {
  constructor() {
    this.init()
  }

  init() {
    if (this.ELBClient) return
    const { region, accessKeyId, secretAccessKey } = awsHandler.getAWSCredConfig

    this.ELBClient = new ElasticLoadBalancingV2Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  async createTargetGroup(options) {
    const { appId, containerName, envId, port = 80, fargateConfig } = options
    const { vpcId } = fargateConfig

    const command = new CreateTargetGroupCommand({
      Name: `${containerName}TG`,
      Protocol: 'HTTP',
      ProtocolVersion: 'HTTP1',
      Port: port,
      HealthCheckEnabled: true,
      HealthCheckPath: '/',
      HealthCheckIntervalSeconds: 60,
      HealthCheckTimeoutSeconds: 30,
      VpcId: vpcId,
      TargetType: 'ip',
      IpAddressType: 'ipv4',
      Tags: [
        { key: 'appId', value: appId },
        { key: 'envId', value: envId },
      ],
    })
    const { TargetGroups } = await this.ELBClient.send(command)
    return {
      TargetGroup: TargetGroups[0],
      target_group_data: TargetGroups[0],
      target_group_name: TargetGroups[0].TargetGroupName,
      target_group_arn: TargetGroups[0].TargetGroupArn,
    }
  }

  async createLoadBalancer(options) {
    const { appId, envId, containerName, fargateConfig } = options
    const { subnetIds, securityGroupIds } = fargateConfig

    const command = new CreateLoadBalancerCommand({
      Name: `${containerName}LB`,
      Subnets: subnetIds,
      SecurityGroups: securityGroupIds,
      Tags: [
        { key: 'appId', value: appId },
        { key: 'envId', value: envId },
      ],
      Type: 'application',
      IpAddressType: 'ipv4',
      Scheme: 'internet-facing',
    })
    const { LoadBalancers } = await this.ELBClient.send(command)

    return {
      LoadBalancer: LoadBalancers[0],
      load_balancer_data: LoadBalancers[0],
      load_balancer_name: LoadBalancers[0].LoadBalancerName,
      load_balancer_arn: LoadBalancers[0].LoadBalancerArn,
    }
  }

  async createLoadBalancerListener(options) {
    const { appId, envId, containerName, loadBalancerArn, targetGroupArn, port = 80 } = options
    const command = new CreateListenerCommand({
      LoadBalancerArn: loadBalancerArn,
      Protocol: 'HTTP',
      Port: port,
      // SslPolicy: '',
      // Certificates: '',
      DefaultActions: [
        {
          Type: 'forward',
          TargetGroupArn: targetGroupArn,
        },
      ],
      // AlpnPolicy: '',
      Tags: [
        { key: 'appId', value: appId },
        { key: 'envId', value: envId },
        { key: 'containerName', value: containerName },
      ],
    })
    const { Listeners } = await this.ELBClient.send(command)
    return { Listener: Listeners[0] }
  }
}

const elbHandler = new ELB_Handler()
module.exports = { ELB_Handler, elbHandler }
