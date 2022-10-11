const { execSync } = require('child_process')

const linuxCronStop = async (jobs) => {
  const errors = {}
  for (const config of jobs) {
    try {
      const { job_cmd } = config
      execSync(`(crontab  -l | grep -v '${job_cmd}'  | crontab -)`)
    } catch (error) {
      console.log('error: ', error)
      errors[config.name] = error
    }
  }

  return errors
}

const darwinCronStop = async (config) => {
  await linuxCronStop(config)
}

const windowsCronStop = async (config) => {
  await linuxCronStop(config)
}

const wslCronStop = async (config) => {
  await linuxCronStop(config)
}

module.exports = {
  linuxCronStop,
  darwinCronStop,
  windowsCronStop,
  wslCronStop,
}
