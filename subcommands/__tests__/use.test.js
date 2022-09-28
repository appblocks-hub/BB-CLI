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
const use = require('../use')
const { configstore } = require('../../configstore')
const { feedback } = require('../../utils/cli-feedback')

jest.mock('axios')
jest.mock('../../utils/deployUtil')
jest.mock('../../utils/config-manager')
jest.mock('../../utils/questionPrompts')
jest.mock('../../utils/appconfigStore')
jest.mock('../../configstore')
jest.mock('../../utils/cli-feedback')

const logSpy = jest.spyOn(global.console, 'log').mockImplementation(() => {})

afterAll(() => {
  logSpy.mockRestore()
})

test('Should get current selected space name from config', async () => {
  await use('some_name')
  expect(configstore.get).toHaveBeenCalledWith('currentSpaceName')
})

describe('If currentSpace is set', () => {
  const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {})
  beforeAll(() => {
    configstore.get.mockImplementation(() => 'alreadySetSpaceName')
  })
  afterAll(() => {
    exitSpy.mockRestore()
    configstore.get.mockRestore()
  })
  test('Should provide feedback if trying to set same space', async () => {
    await use('alreadySetSpaceName')
    expect(feedback).toHaveBeenCalled()
  })
  test('Should abort if already set space name is passed', async () => {
    await use('alreadySetSpaceName')
    expect(exitSpy).toHaveBeenCalledWith(0)
  })
})
