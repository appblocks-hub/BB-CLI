/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const path = require('path')
const fs = require('fs')
const { isDirClean, wipeAllFilesIn, createFileSync } = require('../utils/fileAndFolderHelpers')
const isValidAppBlockProject = require('../utils/isValidAppBlockProject')
const { getBlockType, getBlockName, WipeAllConfirmation } = require('../utils/questionPrompts')
const Init = require('./init')
const createBlock = require('../utils/createBlock')

const [p1, p2, ...rest] = process.argv
const ARGSWITHOUTTYPE = [p1, p2, 'TODO']
const ARGSWITHTYPE = [p1, p2, 'TODO', '--type', 'uicontainer']
const DIRPATH = path.resolve('.')
const CONFIGPATH = path.join(DIRPATH, 'appblock.config.json')

jest.mock('../utils/questionPrompts')
jest.mock('../utils/fileAndFolderHelpers')
jest.mock('../utils/isValidAppBlockProject')
jest.mock('../utils/createBlock')

afterAll(() => jest.clearAllMocks())
afterEach(() => {
  WipeAllConfirmation.mockClear()
  getBlockType.mockClear()
  getBlockName.mockClear()
  createBlock.mockClear()
})
// order of tests is very important here,
// for first two tests, type is not cleared so calling with type first will
// fail the next test,
// mock of isDirClean returns false first and true second

test('Should prompt for type', async () => {
  isDirClean.mockReturnValue(true)
  await Init(ARGSWITHOUTTYPE)
  expect(getBlockType).toHaveBeenCalledTimes(1)
})
test('Should try to create config file', async () => {
  createFileSync.mockReset()
  getBlockName.mockResolvedValue('test1')
  getBlockType.mockResolvedValue('test2')
  const d = {
    name: 'test1',
    type: 'test2',
  }
  await Init(ARGSWITHOUTTYPE)
  expect(createFileSync).toHaveBeenCalledWith(CONFIGPATH, d)
})
test('Should not prompt for type', async () => {
  isDirClean.mockReturnValue(true)
  await Init(ARGSWITHTYPE)
  expect(getBlockType).not.toBeCalled()
})

test('Should prompt for block name', async () => {
  isDirClean.mockReturnValue(true)
  await Init(ARGSWITHTYPE)
  expect(getBlockName).toBeCalled()
})

test('Should check if Dir is clean', async () => {
  await Init(ARGSWITHTYPE)
  expect(isDirClean).toHaveBeenCalled()
})

describe('If Dir is clean', () => {
  beforeAll(() => {
    isDirClean.mockClear()
    isValidAppBlockProject.mockReset()
  })
  test('Should not call isValidAppBlockProject', async () => {
    isDirClean.mockReturnValue(true)
    await Init(ARGSWITHTYPE)
    expect(isDirClean).toHaveReturnedWith(true)
    expect(isValidAppBlockProject).not.toHaveBeenCalled()
  })
})

describe('In unclean directory', () => {
  beforeAll(() => {
    isDirClean.mockClear()
    isDirClean.mockReturnValue(false)
  })

  test('Should call isValidAppBlockProject', async () => {
    await Init(ARGSWITHTYPE)
    expect(isDirClean).toHaveReturnedWith(false)
    expect(isValidAppBlockProject).toHaveBeenCalled()
  })

  describe('for valid appblock project', () => {
    beforeAll(() => {
      isValidAppBlockProject.mockClear()
      isValidAppBlockProject.mockReturnValue(true)

      fs.writeFileSync('appblock.config.json', JSON.stringify({ name: 'test', type: 'testType' }))
    })
    afterAll(() => {
      fs.rmSync('appblock.config.json')
    })
    test('Should not ask for wiping confirmation', async () => {
      await Init(ARGSWITHTYPE)
      expect(WipeAllConfirmation).not.toBeCalled()
      expect(getBlockType).not.toBeCalled()
      expect(getBlockName).not.toBeCalled()
    })
    test('Should call createBlock with test and testType', async () => {
      await Init(ARGSWITHTYPE)
      expect(WipeAllConfirmation).not.toBeCalled()
      expect(getBlockType).not.toBeCalled()
      expect(getBlockName).not.toBeCalled()
      expect(createBlock).toBeCalledWith('test', 'testType')
    })
  })

  describe('for non valid appblock project', () => {
    beforeAll(() => {
      isValidAppBlockProject.mockClear()
      isValidAppBlockProject.mockReturnValue(false)
    })
    afterEach(() => {
      wipeAllFilesIn.mockReset()
    })

    test('Should ask for wiping confirmation', async () => {
      WipeAllConfirmation.mockResolvedValue({ wipeAll: true })
      await Init(ARGSWITHTYPE)
      expect(WipeAllConfirmation).toBeCalled()
      expect(createBlock).toBeCalled()
    })

    test('Should wipe all, if confirmed', async () => {
      WipeAllConfirmation.mockResolvedValue({ wipeAll: true })
      await Init(ARGSWITHTYPE)
      expect(wipeAllFilesIn).toBeCalled()
      expect(createBlock).toBeCalled()
    })

    test('Should not wipe all, if not confirmed', async () => {
      WipeAllConfirmation.mockResolvedValue({ wipeAll: false })
      await Init(ARGSWITHTYPE)
      expect(wipeAllFilesIn).not.toBeCalled()
      expect(createBlock).not.toBeCalled()
    })
  })
})
