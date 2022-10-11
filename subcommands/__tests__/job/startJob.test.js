/**
 * Copyright (c) Appblocks and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const os = require('os')
const startJob = require('../../job/start')
const { appConfig } = require('../../../utils/appconfigStore')
const wslCheck = require('../../../utils/wslCheck')
const { linuxCronStart, wslCronStart, windowsCronStart, darwinCronStart } = require('../../job/start/util')

jest.mock('os')
jest.mock('console')
jest.mock('../../../utils/appconfigStore')
jest.mock('../../../utils/wslCheck')
jest.mock('../../job/start/util')
jest.mock('../../../loader')

describe('job start', () => {
  beforeAll(() => {
    appConfig.appConfig = {
      name: 'test_app',
      dependencies: { testJob: { meta: { type: 'job', job: { schedule: '1 * * * *', time_zone: 'UTC' } } } },
    }
    appConfig.getLiveDetailsof = jest.fn(() => ({
      port: 3000,
      isOn: true,
    }))

    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  test('should create corn job that hits job apis for darwin', async () => {
    os.platform = jest.fn(() => 'darwin')

    await startJob()

    expect(darwinCronStart).toBeCalled()
  })

  test('should create corn job that hits job apis fo ws', async () => {
    os.platform = jest.fn(() => 'win32')

    await startJob()

    expect(windowsCronStart).toBeCalled()
  })

  test('should create corn job that hits job apis for linux', async () => {
    os.platform = jest.fn(() => 'linux')
    wslCheck.mockResolvedValueOnce('')

    await startJob()

    expect(wslCheck).toBeCalled()
    expect(linuxCronStart).toBeCalled()
  })

  test('should create corn job that hits job apis for wsl', async () => {
    os.platform = jest.fn(() => 'linux')
    wslCheck.mockResolvedValueOnce('WSL')

    await startJob()

    expect(wslCheck).toBeCalled()
    expect(wslCronStart).toBeCalled()
  })
})
