/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const { rename, readdir } = require('fs/promises')
const create = require('../../subcommands/create')
const { CreateError } = require('../errors/createError')
const { confirmationPrompt, readInput } = require('../questionPrompts')
const { offerAndCreateBlock } = require('../sync-utils')

const logspy = jest.spyOn(global.console, 'log').mockImplementation(() => {})
afterAll(() => {
  logspy.mockReset()
})
jest.mock('../questionPrompts')
jest.mock('../../subcommands/create')
jest.mock('fs/promises')
jest.mock('console')

const moveBlockCode = jest.fn()

const userEnteredBlockName = 'bob-odenkirk'
const folderPaths = ['one', 'two', 'three']
const createCallArgs = ['bob-odenkirk', { type: null }, null, true, '.']
const k = {
  detailsInRegistry: {
    name: 'testHome2',
    type: 'ui-elements',
    source: {
      https: 'https://github.com/username/testHome2',
      ssh: 'git@github.com:username/testHome2.git',
    },
    language: 'nodejs',
    start: 'npx webpack-dev-server',
    build: 'npx webpack',
    postPull: 'npm i',
    standAloneBlock: false,
  },
  localBlockConfig: {
    name: 'testHome2',
    type: 'ui-elements',
    source: {
      https: 'https://github.com/username/testHome2',
      ssh: 'git@github.com:username/testHome2.git',
    },
    language: 'nodejs',
    start: 'npx webpack-dev-server',
    build: 'npx webpack',
    postPull: 'npm i',
    standAloneBlock: false,
  },
}

const sampleReportForCopyFailure = [
  {
    registered: true,
    copied: false,
    oldPath: 'one',
    name: userEnteredBlockName,
    sourcemismatch: false,
    newName: userEnteredBlockName,
    directory: 'a/simple/path/testHome2',
    data: { ...k },
  },
]
const successfulReportSample = [{ ...sampleReportForCopyFailure[0], copied: true }]
const sampleReportForRegisterFailure = [
  {
    registered: false,
    copied: false,
    oldPath: 'one',
  },
]

describe('offerAndCreateBlocks', () => {
  beforeEach(() => {
    confirmationPrompt.mockRestore()
  })

  test('Should return if empty list is passed', async () => {
    const e = await offerAndCreateBlock(['a'])
    expect(e).toHaveLength(0)
  })

  test('Should call confimationPrompt', async () => {
    await offerAndCreateBlock(['a'])
    confirmationPrompt.mockResolvedValue(true)
    expect(confirmationPrompt).toHaveBeenCalled()
  })

  test('Should return if user answers NO for confirmation', async () => {
    confirmationPrompt.mockResolvedValue(false)
    const e = await offerAndCreateBlock(['a'])
    expect(e).toHaveLength(0)
  })

  test(`Should prompt block creation question for all elements of passed array `, async () => {
    // Firs call to confirmation prompt will return true, rest is false
    // And the last call should be with the last element in foldersPath
    confirmationPrompt.mockResolvedValueOnce(true).mockResolvedValue(false)
    await offerAndCreateBlock(folderPaths)
    expect(confirmationPrompt).toHaveBeenLastCalledWith({
      name: `block-${folderPaths.length - 1}`,
      message: `Should i register ${folderPaths[folderPaths.length - 1]}`,
      default: false,
    })
  })

  describe('If user answers YES for confirmation prompt', () => {
    afterEach(() => {
      logspy.mockClear()
    })
    afterAll(() => {
      logspy.mockRestore()
    })
    beforeEach(() => {
      // both confirmation prompt for "Should i create new blocks from stale" and "Should i create block from xyz" answers YES
      confirmationPrompt.mockResolvedValue(true)
      readInput.mockResolvedValue(userEnteredBlockName)
      rename.mockReset()
    })

    test('Should call create', async () => {
      await offerAndCreateBlock(folderPaths.slice(0, 1))
      expect(create).toHaveBeenCalled()
    })

    test('Should prompt user for a block name', async () => {
      await offerAndCreateBlock(folderPaths.slice(0, 1))
      expect(readInput).toHaveBeenCalled()
    })

    test('Should call create with user entered name', async () => {
      readInput.mockResolvedValueOnce('sam-sankar')
      await offerAndCreateBlock(folderPaths.slice(0, 1))
      createCallArgs[0] = 'sam-sankar'
      expect(create).toHaveBeenCalledWith(...createCallArgs)
    })

    test('Should prompt user for copy permission', async () => {
      confirmationPrompt.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(false)
      await offerAndCreateBlock(folderPaths.slice(0, 1))
      expect(confirmationPrompt).toHaveBeenLastCalledWith({
        name: 'moveBlockCode',
        message: 'Should I move all files to new location',
        default: true,
      })
    })

    test('Should read the dir and get the files list if user asks to copy files', async () => {
      confirmationPrompt.mockResolvedValue(true)
      readdir.mockClear()
      await offerAndCreateBlock(folderPaths.slice(0, 1))
      expect(readdir).toHaveBeenCalledWith(...folderPaths.slice(0, 1))
    })

    test('Should display error if reading dir fails', async () => {
      confirmationPrompt.mockResolvedValue(true)
      logspy.mockClear()
      readdir.mockImplementationOnce(() => {
        const e = new Error()
        e.message = 'failed to read dir'
        e.name = 'ENOENT'
        throw new Error(e)
      })
      await offerAndCreateBlock(folderPaths.slice(0, 1))
      expect(logspy).toHaveBeenCalledWith('ENOENT: failed to read dir')
    })

    test('Should shown error message if create fails', async () => {
      rename.mockClear()
      create.mockImplementationOnce(() => {
        throw new CreateError('Create failed')
      })
      await offerAndCreateBlock(folderPaths)
      // Check if error message is shown
      expect(logspy).toBeCalledWith(`Creation of ${userEnteredBlockName} with data from ${folderPaths[0]} failed`)
    })

    test('Checking return value if registering has failed', async () => {
      create.mockImplementationOnce(() => {
        throw new CreateError('Copying failed')
      })
      const res = await offerAndCreateBlock(folderPaths.slice(0, 1))
      expect(res).toEqual(sampleReportForRegisterFailure)
    })

    test('Checking return value if copying has failed', async () => {
      rename.mockImplementationOnce(() => {
        throw new Error('Copying failed')
      })
      const res = await offerAndCreateBlock(folderPaths.slice(0, 1))
      expect(res).toEqual(sampleReportForCopyFailure)
    })

    test('Checking return value if function has executed successfully', async () => {
      create.mockClear()
      readdir.mockImplementationOnce(() => ['a'])

      rename.mockImplementationOnce(() => {
        return
      })
      const res = await offerAndCreateBlock(folderPaths.slice(0, 1))
      expect(res).toEqual(successfulReportSample)
    })
  })
})
