/* eslint-disable no-undef */
/**
 * Copyright (c) Appblocks and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const os = require('os')
const stopJob = require('../../job/stop')
const { appConfig } = require('../../../utils/appconfigStore')
const wslCheck = require('../../../utils/wslCheck')
const { linuxCronStop, wslCronStop, windowsCronStop, darwinCronStop } = require('../../job/stop/util')

jest.mock('os')
jest.mock('console')
jest.mock('../../../utils/appconfigStore')
jest.mock('../../../utils/wslCheck')
jest.mock('../../job/stop/util')
jest.mock('../../../loader')

describe('job stop', () => {
  beforeAll(() => {
    appConfig.appConfig = {
      name: 'test_app',
      dependencies: { testJob: { meta: { type: 'job', job: { schedule: '1 * * * *', time_zone: 'UTC' } } } },
    }
    appConfig.liveJobBlocks = [
      {
        port: 3000,
        isJobOn: true,
        job_cmd: '* * * * * TZ=UTC http://localhost:4000/testjob # testjob',
        meta: { name: 'testJob' },
      },
    ]
    appConfig.getLiveDetailsof = jest.fn(() => ({
      port: 3000,
      isJobOn: true,
    }))

    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  test('should create corn job that hits job apis for darwin', async () => {
    os.platform = jest.fn(() => 'darwin')

    await stopJob()

    expect(darwinCronStop).toBeCalled()
  })

  test('should create corn job that hits job apis fo ws', async () => {
    os.platform = jest.fn(() => 'win32')

    await stopJob()

    expect(windowsCronStop).toBeCalled()
  })

  test('should create corn job that hits job apis for linux', async () => {
    os.platform = jest.fn(() => 'linux')
    wslCheck.mockResolvedValueOnce('')

    await stopJob()

    expect(wslCheck).toBeCalled()
    expect(linuxCronStop).toBeCalled()
  })

  test('should create corn job that hits job apis for wsl', async () => {
    os.platform = jest.fn(() => 'linux')
    wslCheck.mockResolvedValueOnce('WSL')

    await stopJob()

    expect(wslCheck).toBeCalled()
    expect(wslCronStop).toBeCalled()
  })
})
