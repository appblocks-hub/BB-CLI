/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
const deploy = require('../deploy')
const { readInput } = require('../../utils/questionPrompts')
const deployConfig = require('../../utils/deployConfig-manager')
const { viewsDeploy, functionsDeploy, createDeployHistory } = require('../../utils/deployUtil')

jest.mock('../../utils/config-manager')
jest.mock('../../utils/questionPrompts')
jest.mock('../../utils/deployUtil')
jest.mock('../../utils/deployConfig-manager')

const options = {}

describe('Deploy command', () => {
  beforeAll(() => {
    deployConfig.init()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should deploy with selected deploy id and method', async () => {
    readInput.mockResolvedValueOnce('deploy_id')
    readInput.mockResolvedValueOnce(0)
    const updatedAppData = deployConfig.deployAppConfig
    delete updatedAppData.uploads
    functionsDeploy.mockResolvedValueOnce(updatedAppData)

    await deploy(options)

    expect(viewsDeploy).toHaveBeenCalled()
    expect(functionsDeploy).toHaveBeenCalled()
    expect(createDeployHistory).toHaveBeenCalled()
  })

  test('should throw error on uploading views ', () => {
    readInput.mockResolvedValueOnce('deploy_id')
    readInput.mockResolvedValueOnce(0)

    viewsDeploy.mockRejectedValueOnce(new Error('Error uploading views'))

    expect(async () => {
      await deploy(options)
    }).rejects.toThrow('Deployment failed Error uploading views')
  })

  test('should throw error on creating deploy history ', () => {
    readInput.mockResolvedValueOnce('deploy_id')
    readInput.mockResolvedValueOnce(0)

    createDeployHistory.mockRejectedValueOnce(new Error('Error creating deploy history'))

    expect(async () => {
      await deploy(options)
    }).rejects.toThrow('Deployment failed Error creating deploy history')
  })

  test('should throw error on uploading functions ', () => {
    readInput.mockResolvedValueOnce('deploy_id')
    readInput.mockResolvedValueOnce(0)

    functionsDeploy.mockRejectedValueOnce(new Error('Error uploading functions'))

    expect(async () => {
      await deploy(options)
    }).rejects.toThrow('Deployment failed Error uploading functions')
  })
})
