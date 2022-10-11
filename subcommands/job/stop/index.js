/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-console */

const os = require('os')
const { spinnies } = require('../../../loader')
const { appConfig } = require('../../../utils/appconfigStore')
const wslCheck = require('../../../utils/wslCheck')
const { linuxCronStop, wslCronStop, windowsCronStop, darwinCronStop } = require('./util')

const stopJob = async (name) => {
  try {
    await appConfig.init()
    spinnies.add('job-stop', { text: 'Removing job' })

    let jobs = []
    const appLiveJobBlocks = [...appConfig.liveJobBlocks]

    if (appLiveJobBlocks.length < 1) {
      spinnies.succeed('job-stop', { text: `No jobs to remove` })
      return
    }

    if (!name) {
      console.log('No job name provided, removing all jobs')
      jobs = appLiveJobBlocks.map((blockData) => ({
        name: blockData.meta.name,
        job_cmd: blockData.job_cmd.replaceAll('"', ''),
      }))
    } else {
      const blockData = appLiveJobBlocks.find(({ meta }) => meta.name === name)
      jobs.push({ job_cmd: blockData.job_cmd.replaceAll('"', ''), name })
    }

    if (jobs.length < 1) {
      spinnies.succeed('job-stop', { text: `No jobs to remove` })
      return
    }

    let cronSetErrors = []
    switch (os.platform()) {
      case 'darwin':
        cronSetErrors = await darwinCronStop(jobs)
        break
      case 'win32':
        cronSetErrors = await windowsCronStop(jobs)
        break
      case 'linux':
        try {
          const t = await wslCheck()
          if (t === 'WSL') cronSetErrors = await wslCronStop(jobs)
          else cronSetErrors = await linuxCronStop(jobs)
        } catch (e) {
          if (e.status === 127) {
            console.log('crontab not installed, Please install crontab')
            throw new Error('crontab not found')
          } else {
            console.log('Error removing job : ', e.message)
          }
        }
        break
      default:
        console.log(`OS not supported...`)
        break
    }

    Object.entries(cronSetErrors).forEach(([jname, e]) => {
      console.log(`Error removing job for ${jname}: `, e.message)
    })

    jobs = jobs.filter(({ name: jname }) => !Object.keys(cronSetErrors).includes(jname))

    jobs.forEach((job) => {
      appConfig.stopJobBlock = job.name
    })

    spinnies.succeed('job-stop', { text: `Removed job for ${jobs.map((job) => job.name)}` })

    // console.log(task)
  } catch (e) {
    spinnies.fail('job-stop', { text: 'Failed removing job' })
    console.log(`Couldn't remove job`, e.message)
  }
}

module.exports = stopJob
