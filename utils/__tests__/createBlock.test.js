/* eslint-disable */

const { configstore } = require('../../configstore')
const { blockTypeInverter } = require('../blockTypeInverter')
const createBlock = require('../createBlock')
const { getPrefix } = require('../questionPrompts')
const registerBlock = require('../registerBlock')

jest.mock('../../configstore')
jest.mock('../questionPrompts')
jest.mock('../registerBlock')

afterEach(() => {
  jest.clearAllMocks()
})

const [p1, p2, ...rest] = process.argv
const samplecreateBlockArgs = ['TODO', 'uicontainer']
const testData = [
  {
    args: ['TODO', 'appBlock'],
    expect: blockTypeInverter('appBlock'),
  },
  {
    args: ['TODO', 'ui-container'],
    expect: blockTypeInverter('ui-container'),
  },
  {
    args: ['TODO', 'ui-elements'],
    expect: blockTypeInverter('ui-elements'),
  },
  {
    args: ['TODO', 'data'],
    expect: blockTypeInverter('data'),
  },
  {
    args: ['TODO', 'shared-fn'],
    expect: blockTypeInverter('shared-fn'),
  },
]

describe('For a ', () => {
  testData.forEach((obj) =>
    test('Should call registerBlock with ' + obj.expect, async () => {
      await createBlock.apply(null, obj.args)
      expect(registerBlock.mock.calls[0][0]).toBe(obj.expect)
    })
  )
})

test('Should check for stored prefix first', async () => {
  await createBlock.apply(null, samplecreateBlockArgs)
  expect(configstore.get).toHaveBeenNthCalledWith(1, 'blockPrefix', '')
})
test('Should get and set prefix if not present already', async () => {
  const userGivenPrefix = 'aPrefix'
  configstore.get.mockResolvedValue('')
  getPrefix.mockResolvedValue(userGivenPrefix)
  await createBlock.apply(null, samplecreateBlockArgs)
  expect(getPrefix).toHaveBeenCalledTimes(1)
  expect(configstore.set).toHaveBeenCalledWith('blockPrefix', userGivenPrefix)
})

test('Should not try to get prefix', async () => {
  configstore.get.mockResolvedValue('test')
  await createBlock.apply(null, samplecreateBlockArgs)
  expect(getPrefix).not.toHaveBeenCalled()
})
