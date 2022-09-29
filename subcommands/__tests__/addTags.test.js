/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
const addTags = require('../addTags')
const { default: axios } = require('axios')
const { appRegistryAssignTags } = require('../../utils/api')
const { getShieldHeader } = require('../../utils/getHeaders')
const { readInput } = require('../../utils/questionPrompts')
const { appConfig } = require('../../utils/appconfigStore')

jest.mock('axios')
jest.mock('../../utils/deployUtil')
jest.mock('../../utils/config-manager')
jest.mock('../../utils/questionPrompts')
jest.mock('../../utils/appconfigStore')

const axiosOptions = {
  headers: getShieldHeader(),
}

describe('Add tags command', () => {
  beforeAll(() => {
    appConfig.init()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should add tags', async () => {
    appConfig.getBlockId.mockResolvedValueOnce('app_block_id')
    appConfig.getBlockId.mockResolvedValue('block_id')

    readInput.mockResolvedValueOnce([{ block_name: 'test_block', block_id: 'block_id', tags: [] }])
    readInput.mockResolvedValueOnce('test_tag')

    axios.post = jest
      .fn()
      .mockResolvedValueOnce(Promise.resolve({ data: { success: true, data: { block_id: 'cat_1' } } }))

    await addTags({})

    expect(axios.post).toHaveBeenCalledWith(
      appRegistryAssignTags,
      {
        blocks: [
          {
            block_id: 'block_id',
            tag_name: 'test_tag',
          },
        ],
      },
      axiosOptions
    )
    expect(appConfig.updateBlock).toHaveBeenCalled()
  })

  test('should reject for not selecting blocks  ', () => {
    appConfig.getBlockId.mockResolvedValueOnce('app_block_id')
    appConfig.getBlockId.mockResolvedValue('block_id')

    readInput.mockResolvedValueOnce([])

    expect(async () => {
      await addTags({})
    }).rejects
  })

  test('should reject for entering tags', () => {
    appConfig.getBlockId.mockResolvedValueOnce('app_block_id')
    appConfig.getBlockId.mockResolvedValue('block_id')

    readInput.mockResolvedValueOnce([{ block_name: 'test_block', block_id: 'block_id', tags: [] }])
    readInput.mockResolvedValueOnce([])

    expect(async () => {
      await addTags({})
    }).rejects
  })
})
