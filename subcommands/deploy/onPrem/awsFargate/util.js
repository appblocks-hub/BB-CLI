/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../../../loader')
const { ec2Handler } = require('../../../../utils/aws/ec2')
const { readInput } = require('../../../../utils/questionPrompts')

const CPU_MEMORY_COMBINATIONS = [
  {
    cpu: '.25 vCPU',
    memory: ['.5 GB', '1 GB', '2 GB'],
  },
  {
    cpu: '.5 vCPU',
    memory: Array.from({ length: 4 }, (_, i) => `${i + 1} GB`),
  },
  {
    cpu: '1 vCPU',
    memory: Array.from({ length: 7 }, (_, i) => `${i + 2} GB`),
  },
  {
    cpu: '2 vCPU',
    memory: Array.from({ length: 13 }, (_, i) => `${i + 4} GB`), // 4 GB - 16 GB (interval 1GB)
  },
  {
    cpu: '4 vCPU',
    memory: Array.from({ length: 23 }, (_, i) => `${i + 8} GB`), // 8 GB - 30 GB (interval 1GB)
  },
  {
    cpu: '8 vCPU',
    memory: Array.from({ length: 12 }, (_, i) => `${i * 4 + 16} GB`), // 16 GB - 60 GB (interval 4GB)
  },
]

const getAWSFargateConfig = async () => {
  spinnies.add('vpcGet', { text: 'Getting vpcs' })
  const vpcs = await ec2Handler.describeVpcs()
  spinnies.remove('vpcGet')
  const vpcId = await readInput({
    type: 'list',
    name: 'vpcId',
    message: 'Select the vpc to connect',
    choices: vpcs.map((v) => ({ name: v.VpcId, value: v.VpcId })),
    validate: (input) => {
      if (!input) return `Invalid input`
      return true
    },
  })

  spinnies.add('subnets', { text: 'Getting subnets' })
  const subnets = await ec2Handler.describeSubnets({ filters: [{ Name: 'vpc-id', Values: [vpcId] }] })
  spinnies.remove('subnets')

  const subnetIds = await readInput({
    type: 'checkbox',
    name: 'subnetIds',
    message: 'Select the subnets',
    choices: subnets.map((s) => ({ name: s.SubnetId, value: s.SubnetId })),
    validate: (input) => {
      if (!input) return `Invalid input`
      if (input.length < 2) return `Min 2 subnets required`
      return true
    },
  })

  spinnies.add('sg', { text: 'Getting Security Groups' })
  const securityGroupList = await ec2Handler.describeSecurityGroups({ filters: [{ Name: 'vpc-id', Values: [vpcId] }] })
  spinnies.remove('sg')

  const securityGroupIds = await readInput({
    type: 'checkbox',
    name: 'securityGroupIds',
    message: 'Enter security group ',
    choices: securityGroupList.map((sg) => ({ name: sg.GroupName, value: sg.GroupId })),
    validate: (input) => {
      if (!input || input?.length < 1) return `Invalid input`
      return true
    },
  })

  const cpu = await readInput({
    type: 'list',
    name: 'cpu',
    message: 'Select the amount of CPU to reserve for your task',
    choices: CPU_MEMORY_COMBINATIONS.map(({ cpu: c }) => c),
    validate: (input) => {
      if (!input || input?.length < 1) return `Invalid input`
      return true
    },
  })

  const memory = await readInput({
    type: 'list',
    name: 'memory',
    message: 'Select the amount of memory to reserve for your task',
    choices: CPU_MEMORY_COMBINATIONS.find(({ cpu: c }) => c === cpu)?.memory,
    validate: (input) => {
      if (!input || input?.length < 1) return `Invalid input`
      return true
    },
  })

  const autoScaleAllowed = true
  // const autoScaleAllowed = await readInput({
  //   type: 'confirm',
  //   name: 'autoScaleAllowed',
  //   message: 'Do you want to add auto scaling',
  //   default: true,
  // })

  const configData = {
    vpcId,
    subnetIds,
    securityGroupIds,
    memory,
    cpu,
    autoScaleAllowed,
    singleBuildDeployment: sBDeployment,
  }

  if (autoScaleAllowed) {
    configData.minCapacity = await readInput({
      type: 'number',
      name: 'minCapacity',
      message: 'Enter the minimum value that you plan to scale in to (min no of instances).',
      validate: (input) => {
        if (!input || !/[0-9]/.test(input)) return `Invalid input`
        return true
      },
      default: 1,
    })

    configData.maxCapacity = await readInput({
      type: 'number',
      name: 'maxCapacity',
      message: 'Enter the maximum value that you plan to scale out to (max no of instances).',
      validate: (input) => {
        if (!input || !/[0-9]/.test(input) || input < configData.minCapacity) return `Invalid input`
        return true
      },
      default: 3,
    })
  }

  configData.desiredCount = await readInput({
    type: 'number',
    name: 'desiredCount',
    message:
      'Enter the number of instantiations of the specified task definition to place and keep running on your cluster.',
    validate: (input) => {
      if (!input) return `Invalid input`
      if (!/[0-9]/.test(input) || input < configData.minCapacity || input > configData.maxCapacity) {
        return `Value should be in between min capacity and max capacity`
      }
      return true
    },
    default: 2,
  })

  return configData
}

module.exports = {
  getAWSFargateConfig,
}
