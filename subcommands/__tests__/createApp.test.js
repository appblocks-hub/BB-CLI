/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
const createApp = require('../createApp')
const { readInput } = require('../../utils/questionPrompts')
const { default: axios } = require('axios')
const { getBlockConfig, getBlockId } = require('../../utils/deployUtil')
const { getShieldHeader } = require('../../utils/getHeaders')
const deployConfig = require('../../utils/deployConfig-manager')
const { appRegistryCreateApp } = require('../../utils/api')

jest.mock('../../utils/questionPrompts')
jest.mock('../../utils/deployUtil')
jest.mock('../../utils/deployConfig-manager')
jest.mock('axios')

describe('Create App command', () => {
  beforeAll(() => {})

  test('should creating saas app', async () => {
    const appName = 'saas-app'
    const envName = 'dev'
    const deploymentMode = 0
    const subDomain = 'saas-app-dev'
    const appBlockId = 'saas-app-block-id'

    readInput.mockResolvedValueOnce(deploymentMode)
    readInput.mockResolvedValueOnce(appName)
    readInput.mockResolvedValueOnce(envName)
    readInput.mockResolvedValueOnce(subDomain)

    getBlockConfig.mockReturnValueOnce({ name: 'saas-app-block' })
    getBlockId.mockResolvedValueOnce(appBlockId)

    const postData = {
      app_block_id: appBlockId,
      app_name: appName,
      environment_name: envName,
      deployment_mode: deploymentMode,
      sub_domain: subDomain,
    }

    const postRes = {
      app_id: 'app_id',
      app_name: appName,
      environment_name: envName,
      deployment_mode: deploymentMode,
      environment_id: 'environment_id',
      backend_url: subDomain + 'functions-Appblocks.com',
      frontend_url: subDomain + 'Appblocks.com',
    }

    axios.post = jest
      .fn()
      .mockResolvedValueOnce(
        Promise.resolve({ data: { data: { ...postRes }, success: true, message: 'App created successfully' } })
      )

    await createApp()

    expect(axios.post).toHaveBeenCalledWith(appRegistryCreateApp, postData, {
      headers: getShieldHeader(),
    })

    // expect(deployConfig.createDeployConfig).toHaveBeenCalled()
  })

  test('should creating erp app', async () => {
    const appName = 'erp-app'
    const envName = 'Production'
    const deploymentMode = 1
    const subDomain = ''
    const appBlockId = 'erp-app-block-id'

    readInput.mockResolvedValueOnce(deploymentMode)
    readInput.mockResolvedValueOnce(appName)

    getBlockConfig.mockReturnValueOnce({ name: 'erp-app-block' })
    getBlockId.mockResolvedValueOnce(appBlockId)

    const postData = {
      app_block_id: appBlockId,
      app_name: appName,
      environment_name: envName,
      deployment_mode: deploymentMode,
      sub_domain: subDomain,
    }

    const postRes = {
      app_id: 'app_id',
      app_name: appName,
      environment_name: envName,
      deployment_mode: deploymentMode,
      environment_id: 'environment_id',
    }

    axios.post = jest
      .fn()
      .mockResolvedValueOnce(
        Promise.resolve({ data: { data: { ...postRes }, success: true, message: 'App created successfully' } })
      )
    await createApp()

    expect(axios.post).toHaveBeenCalledWith(appRegistryCreateApp, postData, {
      headers: getShieldHeader(),
    })
  })

  test('should exit with error', async () => {
    expect(async () => {
      await createApp()
    }).rejects.toThrow("Cannot read properties of undefined (reading 'name')")
  })
})
