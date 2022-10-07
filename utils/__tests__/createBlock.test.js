/* eslint-disable */

const { configstore } = require('../../configstore')
const { blockTypeInverter } = require('../blockTypeInverter')
const createBlock = require('../createBlock')
const createComponent = require('../createComponent')
const registerBlock = require('../registerBlock')

jest.mock('../../configstore')
jest.mock('../questionPrompts')
jest.mock('../registerBlock')
jest.mock('../createComponent')

afterEach(() => {
  jest.clearAllMocks()
})

const [p1, p2, ...rest] = process.argv
const samplecreateBlockArgs = ['TODO', 'uicontainer']
const testData = [
  {
    args: ['TODO', 'todo', 1, false, false, '', false, 'appBlock'],
    expect: blockTypeInverter('appBlock'),
  },
  {
    args: ['TODO', 'todo', 2, false, false, '', false, 'ui-container'],
    expect: blockTypeInverter('ui-container'),
  },
  {
    args: ['TODO', 'todo', 3, false, false, '', false, 'ui-elements'],
    expect: blockTypeInverter('ui-elements'),
  },
  // {
  //   args: ['TODO', 'todo', 5, false, false, '', false, 'data'],
  //   expect: blockTypeInverter('data'),
  // },
  {
    args: ['TODO', 'todo', 6, false, false, '', false, 'shared-fn'],
    expect: blockTypeInverter('shared-fn'),
  },
  {
    args: ['TODO', 'todo', 4, false, false, '', false, 'function'],
    expect: blockTypeInverter('function'),
  },
  {
    args: ['TODO', 'todo', 7, false, false, '', false, 'job', { time_zone: 'UTC', schedule: '1 * * * *' }],
    expect: blockTypeInverter('job'),
  },
]

testData.forEach((obj) =>
  test('Should call registerBlock with ' + obj.expect, async () => {
    await createBlock.apply(null, obj.args)
    expect(registerBlock.mock.calls[0][0]).toBe(obj.expect)
  })
)
