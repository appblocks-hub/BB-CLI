/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {
  EC2Client,
  DescribeSubnetsCommand,
  DescribeVpcsCommand,
  DescribeSecurityGroupsCommand,
} = require('@aws-sdk/client-ec2')
const { configstore } = require('../../../configstore')

class EC2_Handler {
  // constructor() {
  //   this.init()
  // }

  init() {
    if (this.EC2Client) return

    this.awsCredConfig = configstore.get('awsCredConfig') || {}
    const { region, accessKeyId, secretAccessKey } = this.awsCredConfig

    this.EC2Client = new EC2Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  async describeVpcs(options) {
    this.init()

    let vpcs = []
    let nextToken
    const { filters } = options || {}

    do {
      const input = {}
      if (filters) input.Filters = filters
      if (nextToken) input.NextToken = nextToken
      const command = new DescribeVpcsCommand(input)
      const response = await this.EC2Client.send(command)
      nextToken = response.NextToken
      vpcs = vpcs.concat(response.Vpcs)
    } while (nextToken != null)

    return vpcs
  }

  async describeSubnets(options) {
    this.init()

    let subnets = []
    let nextToken
    const { filters } = options || {}

    do {
      const input = {}
      if (filters) input.Filters = filters
      if (nextToken) input.NextToken = nextToken
      const command = new DescribeSubnetsCommand(input)
      const response = await this.EC2Client.send(command)
      nextToken = response.NextToken
      subnets = subnets.concat(response.Subnets)
    } while (nextToken != null)

    return subnets
  }

  async describeSecurityGroups(options) {
    this.init()

    let securityGroups = []
    let nextToken
    const { filters } = options || {}

    do {
      const input = {}
      if (filters) input.Filters = filters
      if (nextToken) input.NextToken = nextToken
      const command = new DescribeSecurityGroupsCommand(input)
      const response = await this.EC2Client.send(command)
      nextToken = response.NextToken
      securityGroups = securityGroups.concat(response.SecurityGroups)
    } while (nextToken != null)

    return securityGroups
  }
}

const ec2Handler = new EC2_Handler()
module.exports = { EC2_Handler, ec2Handler }
