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
const { linuxCronStart, wslCronStart, windowsCronStart, darwinCronStart } = require('./util')

const startJob = async (name) => {
  try {
    await appConfig.init()
    spinnies.add('job-start', { text: 'Scheduling job' })

    let jobs = []
    const appConfigData = await appConfig.appConfig

    if (!name) {
      console.log('No job name provided, Scheduling all jobs')
      jobs = Object.entries(appConfigData.dependencies).reduce((acc, [blockName, blockData]) => {
        if (blockData.meta.type !== 'job') return acc

        const lb = appConfig.getLiveDetailsof(blockName)

        if (!lb?.isOn) {
          console.log(`No live block found for ${blockName}, Job will not be scheduled`)
          return acc
        }

        const { schedule, time_zone } = blockData.meta.job
        const job_cmd = `${schedule} TZ="${time_zone}" curl http://localhost:${lb.port}/${blockName} # ${blockName}`
        acc.push({ name: blockName, job_cmd })

        return acc
      }, [])
    } else {
      const blockConfig = appConfigData.dependencies[name]

      if (!blockConfig) throw new Error('Job name not found')

      const lb = appConfig.getLiveDetailsof(name)

      if (!lb?.isOn) {
        throw new Error(`No live block found for ${name}, Job will not be scheduled`)
      }

      const { schedule, time_zone } = blockConfig.meta.job
      const job_cmd = `${schedule} TZ="${time_zone}" curl http://localhost:${lb.port}/${name} # ${name}`

      jobs.push({ name, job_cmd })
    }

    if (jobs.length < 1) {
      spinnies.fail('job-start', { text: `No jobs to schedule` })
      return
    }

    let cronSetErrors = {}
    switch (os.platform()) {
      case 'darwin':
        cronSetErrors = await darwinCronStart(jobs)
        break
      case 'win32':
        cronSetErrors = await windowsCronStart(jobs)
        break
      case 'linux':
        try {
          const t = await wslCheck()
          if (t === 'WSL') cronSetErrors = await wslCronStart(jobs)
          else cronSetErrors = await linuxCronStart(jobs)
        } catch (e) {
          if (e.status === 127) {
            console.log('crontab not installed, Please install crontab')
            throw new Error('crontab not found')
          } else {
            console.log('Error scheduling job : ', e.message)
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
      appConfig.startedJobBlock = job
    })

    spinnies.succeed('job-start', { text: `Scheduled job for ${jobs.map((job) => job.name)}` })

    // console.log(task)
  } catch (e) {
    spinnies.fail('job-start', { text: 'Failed scheduling job' })
    console.log(`Couldn't schedule job`, e.message)
  }
}

module.exports = startJob
