/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
const addCategories = require('../addCategories')
const { default: axios } = require('axios')
const { appRegistryAssignCategories } = require('../../utils/api')
const { getShieldHeader } = require('../../utils/getHeaders')
const { readInput } = require('../../utils/questionPrompts')
const { appConfig } = require('../../utils/appconfigStore')
const { getCategories } = require('../../utils/categoriesUtil')

jest.mock('axios')
jest.mock('../../utils/deployUtil')
jest.mock('../../utils/config-manager')
jest.mock('../../utils/questionPrompts')
jest.mock('../../utils/appconfigStore')
jest.mock('../../utils/categoriesUtil')

const axiosOptions = {
  headers: getShieldHeader(),
}

describe('Add categories command', () => {
  beforeAll(() => {
    appConfig.init()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('should add categories', async () => {
    appConfig.getBlockId.mockResolvedValueOnce('app_block_id')
    appConfig.getBlockId.mockResolvedValue('block_id')

    readInput.mockResolvedValueOnce([{ block_name: 'test_block', block_id: 'block_id', categories: [] }])
    readInput.mockResolvedValueOnce([
      {
        name: 'category_name',
        value: 'category_id',
        isParent: false,
      },
    ])

    axios.post = jest
      .fn()
      .mockResolvedValueOnce(Promise.resolve({ data: { success: true, data: { block_id: 'cat_1' } } }))

    await addCategories({})

    expect(axios.post).toHaveBeenCalledWith(
      appRegistryAssignCategories,
      {
        blocks: [
          {
            block_id: 'block_id',
            category_id: {
              isParent: false,
              name: 'category_name',
              value: 'category_id',
            },
          },
        ],
      },
      axiosOptions
    )
    expect(getCategories).toHaveBeenCalled()
    expect(appConfig.updateBlock).toHaveBeenCalled()
  })

  test('should reject for not selecting blocks  ', () => {
    appConfig.getBlockId.mockResolvedValueOnce('app_block_id')
    appConfig.getBlockId.mockResolvedValue('block_id')

    readInput.mockResolvedValueOnce([])

    expect(async () => {
      await addCategories({})
    }).rejects
  })

  test('should reject for not selecting categories', () => {
    appConfig.getBlockId.mockResolvedValueOnce('app_block_id')
    appConfig.getBlockId.mockResolvedValue('block_id')

    readInput.mockResolvedValueOnce([{ block_name: 'test_block', block_id: 'block_id', categories: [] }])
    readInput.mockResolvedValueOnce([])

    expect(async () => {
      await addCategories({})
    }).rejects
  })
})
