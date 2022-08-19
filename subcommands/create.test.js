/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
const create = require('./create')
const createBlock = require('../utils/createBlock')
const { getBlockName, getBlockType, confirmationPrompt } = require('../utils/questionPrompts')
const checkBlockNameAvailability = require('../utils/checkBlockNameAvailability')
const { blockTypeInverter } = require('../utils/blockTypeInverter')
const { appConfig } = require('../utils/appconfigStore')
const configstore = require('../configstore')
const { createFileSync } = require('../utils/fileAndFolderHelpers')

jest.mock('../utils/createBlock')
jest.mock('../utils/questionPrompts')
jest.mock('../utils/checkBlockNameAvailability')
jest.mock('../utils/blockTypeInverter')
jest.mock('../utils/appconfigStore')
jest.mock('../configstore')
jest.mock('../utils/fileAndFolderHelpers')

const [p1, p2, ...rest] = process.argv
const testData = [
  {
    args: [p1, p2, 'TODO', '-t', 'uicontainer'],
    expect: 'uicontainer',
  },
  {
    args: [p1, p2, 'TODO', '-t', 'uicomponent'],
    expect: 'uicomponent',
  },
  {
    args: [p1, p2, 'TODO', '-t', 'fncomponent'],
    expect: 'fncomponent',
  },
]

const createEmptyArgs = ['', { type: '' }, {}, true]
const createArgs = ['name', { type: 'function' }, '', true]

const logSpy = jest.spyOn(global.console, 'log').mockImplementation(() => {})
afterEach(() => {
  logSpy.mockClear()
})
afterAll(() => {
  logSpy.mockRestore()
})

describe('Create called with no args', () => {
  beforeEach(() => {})
  beforeAll(() => {
    getBlockName.mockResolvedValue('Name')
    getBlockType.mockResolvedValue('function')
    checkBlockNameAvailability.mockResolvedValue('A-new-name')

    // To stop the program at outodcontext confirmation prompt
    appConfig.isOutOfContext = true
    confirmationPrompt.mockResolvedValue(false)
  })

  afterEach(() => {
    getBlockName.mockClear()
    getBlockType.mockClear()
    checkBlockNameAvailability.mockClear()
  })

  afterAll(() => {
    appConfig.init.mockReset()

    getBlockName.mockReset()
    getBlockType.mockReset()
    checkBlockNameAvailability.mockReset()
  })

  test('Should show new prompt for Block name', async () => {
    await create(...createEmptyArgs)
    expect(getBlockName).toHaveBeenCalled()
  })

  test('Should show invalid name error', async () => {
    confirmationPrompt.mockResolvedValue(false)

    await create(...createEmptyArgs)
    expect(logSpy).toHaveBeenCalledWith('only alphabets and - and _ allowed for block name!')
  })

  test('Should show new prompt for block type', async () => {
    await create(...createEmptyArgs)
    expect(getBlockType).toBeCalled()
  })
})

describe('Create called with args', () => {
  test('Should convert user passed type string to corresponding number', async () => {
    blockTypeInverter.mockReturnValueOnce(4)
    await create('name', { type: 'function' })
    expect(blockTypeInverter).toHaveBeenCalled()
  })
})

const { init } = appConfig
confirmationPrompt.mockResolvedValue(false)

test('Should Check for Block name availability', async () => {
  appConfig.isOutOfContext = true
  await create(...createEmptyArgs)
  expect(checkBlockNameAvailability).toHaveBeenCalled()
})

test('Should try to init with config', async () => {
  await create(...createArgs)
  expect(init).toHaveBeenCalledWith(null, null, 'create')
})

describe('Creating out of context', () => {
  afterEach(() => {
    configstore.get.mockClear()
    createBlock.mockClear()
  })
  appConfig.isOutOfContext = true
  describe('prompt user for out-of-context confirmation', () => {
    configstore.get.mockImplementation(() => 'something')
    test('Should continue with create if user confirms', async () => {
      createFileSync.mockImplementation(() => {})
      confirmationPrompt.mockResolvedValue(true)
      await create(...createArgs)
      expect(configstore.get).toHaveBeenNthCalledWith(1, 'githubUserId', '')
      expect(configstore.get).toHaveBeenNthCalledWith(2, 'githubUserToken', '')
      expect(createBlock).toBeCalled()
    })
    test(`Should NOT continue with create if user doesn't confirms`, async () => {
      confirmationPrompt.mockResolvedValue(false)
      await create(...createArgs)
      expect(configstore.get).not.toHaveBeenNthCalledWith(1, 'githubUserId', '')
      expect(configstore.get).not.toHaveBeenNthCalledWith(2, 'githubUserToken', '')
      expect(createBlock).not.toBeCalled()
    })
  })
})
