/* eslint-disable no-undef */
/**
 * Copyright (c) Appblocks and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { execSync } = require('child_process')
const { darwinCronStop, windowsCronStop, wslCronStop, linuxCronStop } = require('../../job/stop/util')

jest.mock('child_process', () => {
  const originalModule = jest.requireActual('child_process')

  return {
    ...originalModule,
    execSync: jest.fn(() => {}).mockResolvedValue(true),
  }
})

describe('job Stop util', () => {
  const jobs = [{ name: 'testjob', job_cmd: '* * * * * TZ=UTC http://localhost:4000/testjob # testjob' }]
  const jobLength = jobs.length

  beforeEach(() => {
    execSync.mockReset()

    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  test('should create cron for darwin', async () => {
    await darwinCronStop(jobs)
    expect(execSync).toBeCalledTimes(jobLength)
  })
  test('should create cron for windows', async () => {
    await windowsCronStop(jobs)
    expect(execSync).toBeCalledTimes(jobLength)
  })
  test('should create cron for wsl', async () => {
    await wslCronStop(jobs)
    expect(execSync).toBeCalledTimes(jobLength)
  })
  test('should create cron for linux', async () => {
    await linuxCronStop(jobs)
    expect(execSync).toBeCalledTimes(jobLength)
  })
})
