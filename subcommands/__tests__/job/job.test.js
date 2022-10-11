/**
 * Copyright (c) Appblocks and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */

const { writeFileSync } = require('fs')
const { default: axios } = require('axios')
const { readInput } = require('../../../utils/questionPrompts')
const { getJobConfig, isValidJobSchedule, generateJobBlock } = require('../../../utils/job')
const { isValidTimeZone } = require('../../../utils/job')
const registerBlock = require('../../../utils/registerBlock')
const { appBlockRegister } = require('../../../utils/api')
const { getShieldHeader } = require('../../../utils/getHeaders')
// const { createDirForType } = require('../../utils/fileAndFolderHelpers')

jest.mock('fs')
jest.mock('axios')
jest.mock('../../../loader')
jest.mock('../../../configstore')
jest.mock('../../../utils/questionPrompts')

const scheduleSamples = [
  '@annually',
  //At 12:00 pm (noon) every day during the year 2017:
  '0 0 12 * * ? 2017',
  //Every 5 minutes starting at 1 pm and ending on 1:55 pm and then starting at 6 pm and ending at 6:55 pm, every day:
  '0 0/5 13,18 * * ?',
  //Every minute starting at 1 pm and ending on 1:05 pm, every day:
  '0 0-5 13 * * ?',
  //At 1:15 pm and 1:45 pm every Tuesday in the month of June:
  '0 15,45 13 ? 6 TUE',
  //At 9:30 am every Monday, Tuesday, Wednesday, Thursday, and Friday:
  '0 30 9 ? * MON-FRI',
  //At 9:30 am on 15th day of every month:
  '0 30 9 15 * ?',
  //At 6 pm on the last day of every month:
  '0 0 18 L * ?',
  //At 6 pm on the 3rd to last day of every month:
  '0 0 18 L-3 * ?',
  //At 10:30 am on the last Thursday of every month:
  '0 30 10 ? * 5L',
  //At 6 pm on the last Friday of every month during the years 2015, 2016 and 2017:
  '0 0 18 ? * 6L 2015-2017',
  //At 10 am on the third Monday of every month:
  '0 0 10 ? * 2#3',
  //At 12 am midnight on every day for five days starting on the 10th day of the month:
  '0 0 0 10/5 * ?',
]

describe('job', () => {
  beforeAll(() => {
    axios.post.mockResolvedValue(Promise.resolve({ data: { success: true, msg: 'created' } }))
  })

  test('should prompt for job configuration', async () => {
    // prompt for job schedule resolved
    readInput.mockResolvedValueOnce('1 * * * *')
    // prompt for job timezone resolved
    readInput.mockResolvedValueOnce('UTC')

    // expect return job configuration
    const expectedValue = { time_zone: 'UTC', schedule: '1 * * * *' }
    const resultValue = await getJobConfig()
    expect(resultValue).toEqual(expectedValue)

    // expect to call 2 promts
    expect(readInput).toBeCalledTimes(2)
  })

  test('should check is a valid cron schedule', () => {
    // valid test
    scheduleSamples.forEach((sample) => {
      expect(isValidJobSchedule(sample)).toBe(true)
    })

    // invalid test
    expect(isValidJobSchedule('1')).toBe('In valid cron schedule')
    expect(isValidJobSchedule('sample')).toBe('In valid cron schedule')
  })

  test('should check is a valid time zone', () => {
    // valid test
    expect(isValidTimeZone('UTC')).toBe(true)
    // invalid test
    expect(isValidTimeZone('1')).toBe('In valid time zone')
    expect(isValidTimeZone('test')).toBe('In valid time zone')
  })

  test('should generate job block from job template', async () => {
    // create job folder if not exists
    // update createDirForType() with case 7 to create job folder

    // update block config with job configuration
    // if type = job then add job config to job block

    // generate job block from job template
    await generateJobBlock()

    expect(writeFileSync).toBeCalledTimes(3)
  })

  test('should save job block', async () => {
    // api to register job block and save job block configuration (if type = job )

    await registerBlock(7, 'jobBlock', 'jobBlock', true, 'sshUrl', 'job block', {
      time_zone: 'UTC',
      schedule: '1 * * * *',
    })

    expect(axios.post).toBeCalledWith(
      appBlockRegister,
      {
        block_type: 7,
        block_name: 'jobBlock',
        block_short_name: 'jobBlock',
        is_public: true,
        block_desc: 'job block',
        github_url: 'sshUrl',
        job_config: { time_zone: 'UTC', schedule: '1 * * * *' },
      },
      {
        headers: getShieldHeader(),
      }
    )
  })
})
