/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
const { getBBConfig } = require('../../utils/config-manager')
const { getBlockId } = require('../../utils/deployUtil')
const { getPublishedVersion } = require('../publish/index')
const deployConfig = require('../../utils/deployConfig-manager')
const upload = require('../upload')
const { getShieldHeader } = require('../../utils/getHeaders')
const { default: axios } = require('axios')
const { appRegistryUploadBlockStatus, appRegistryCheckAppEnvExist } = require('../../utils/api')

jest.mock('axios')
jest.mock('../publish')
jest.mock('../../utils/config-manager')
jest.mock('../../utils/uploadUtil')
jest.mock('../../utils/deployUtil')
jest.mock('../../utils/deployConfig-manager')

const blockName = 'test_block'
const blockType = 'function'
const options = { environment: 'dev' }
const axiosOptions = { headers: getShieldHeader() }
const dependencies = {
  [blockName]: {
    directory: 'functions/' + blockName,
    meta: {
      name: blockName,
      type: blockType,
    },
  },
  testui: {
    directory: 'functions/testui',
    meta: {
      name: 'testui',
      type: 'ui-elements',
    },
  },
}

const appEnvCheckData = {
  app_id: 'app_id',
  environment_id: 'environment_id',
}

const appEnvCheckRes = { data: { data: { app_exist: true, env_exist: true } } }

const uploadStatusData = {
  metadata: {},
  request_blocks: [{ blockName }, { blockName: 'testui' }],
  environment_id: 'environment_id',
  tags: 'tag',
}
const uploadStatusRes = { data: { data: { deploy_id: 'deploy_id' } } }

describe('Upload command', () => {
  beforeAll(() => {
    deployConfig.init()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should upload all blocks', async () => {
    getBBConfig.mockResolvedValueOnce({ dependencies })

    getBlockId.mockResolvedValue('blockId')

    axios.post = jest
      .fn()
      .mockResolvedValueOnce(Promise.resolve(appEnvCheckRes))
      .mockResolvedValueOnce(Promise.resolve(uploadStatusRes))

    await upload('', options)

    expect(getPublishedVersion).toHaveBeenCalledTimes(Object.keys(dependencies).length)

    expect(axios.post).toHaveBeenCalledWith(appRegistryCheckAppEnvExist, appEnvCheckData, axiosOptions)

    expect(axios.post).toHaveBeenCalledWith(appRegistryUploadBlockStatus, uploadStatusData, axiosOptions)
  })

  test('should upload blocks by type', async () => {
    getBBConfig.mockResolvedValueOnce({ dependencies })

    getBlockId.mockResolvedValue('blockId')

    axios.post = jest
      .fn()
      .mockResolvedValueOnce(Promise.resolve(appEnvCheckRes))
      .mockResolvedValueOnce(Promise.resolve(uploadStatusRes))

    await upload(blockType, options)

    expect(getPublishedVersion).toHaveBeenCalledTimes(
      Object.values(dependencies).filter(({ meta }) => meta.type === blockType).length
    )

    expect(axios.post).toHaveBeenCalledWith(appRegistryCheckAppEnvExist, appEnvCheckData, axiosOptions)

    uploadStatusData.request_blocks = [{ blockName }]
    expect(axios.post).toHaveBeenCalledWith(appRegistryUploadBlockStatus, uploadStatusData, axiosOptions)
  })
  test('should upload single blocks', async () => {
    getBBConfig.mockResolvedValueOnce({ dependencies })

    getBlockId.mockResolvedValue('blockId')

    axios.post = jest
      .fn()
      .mockResolvedValueOnce(Promise.resolve(appEnvCheckRes))
      .mockResolvedValueOnce(Promise.resolve(uploadStatusRes))

    await upload(blockName, options)

    expect(getPublishedVersion).toHaveBeenCalledTimes(1)

    expect(axios.post).toHaveBeenCalledWith(appRegistryCheckAppEnvExist, appEnvCheckData, axiosOptions)

    expect(axios.post).toHaveBeenCalledWith(appRegistryUploadBlockStatus, uploadStatusData, axiosOptions)
  })
})
