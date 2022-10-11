const { execSync } = require('child_process')

const linuxCronStart = async (jobs) => {
  const errors = {}
  for (const config of jobs) {
    try {
      const { job_cmd } = config
      execSync(`(crontab -l ; echo "${job_cmd}") | crontab -`)
    } catch (error) {
      errors[config.name] = error
    }
  }

  return errors
}

const darwinCronStart = async (config) => {
  await linuxCronStart(config)
}

const windowsCronStart = async (config) => {
  //  TODO ws support
  // $action = New-ScheduledTaskAction -Execute 'cmd.exe'
  // $trigger = New-ScheduledTaskTrigger -Daily -At 1pm
  // Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "my-task"

  await linuxCronStart(config)
}

const wslCronStart = async (config) => {
  //  TODO wsl support
  await linuxCronStart(config)
}

module.exports = {
  linuxCronStart,
  darwinCronStart,
  windowsCronStart,
  wslCronStart,
}
