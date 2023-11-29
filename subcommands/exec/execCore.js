const path = require('path')
const chalk = require('chalk')
const { AsyncSeriesHook } = require('tapable')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const { processExec } = require('./utils')

/**
 * @class
 */
class ExecCore {
  /**
   * @param {} options
   */
  constructor(command, options, logger, spinnies) {
    this.cwd = process.cwd()

    this.command = command
    this.cmdArgs = []
    this.cmdOpts = options
    this.logger = logger
    this.spinnies = spinnies

    this.manager = {}
    this.pathList = []

    this.hooks = {
      beforeExec: new AsyncSeriesHook(['context']),
      afterExec: new AsyncSeriesHook(['context']),
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async initializeConfigManager() {
    const configPath = path.resolve(BB_CONFIG_NAME)
    const { manager, error } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      throw new Error('Please run the command inside package context ')
    }

    this.manager = manager
  }

  async exec() {
    this.logger.info('exec command')

    await this.hooks.beforeExec?.promise(this)

    console.log(`\n${chalk.whiteBright(this.command)} will be run in the following blocks\n`)
    this.pathList.forEach((v) => {
      console.log(`${chalk.blue(v.config.name)} : ${chalk.italic(path.relative(path.resolve(), v.directory))}`)
      this.logger.info(v.directory)
    })
    console.log('\n')
    Promise.allSettled(this.pathList.map((l) => processExec(this.command, { cwd: l.directory }, l.config.name))).then(
      (res) => {
        res.forEach((v) => {
          const colour = v.value.err ? chalk.red : chalk.green
          console.log(colour(v.value.name))
          console.log(`${v.value.out}\n`)
        })
      }
    )

    await this.hooks.afterExec?.promise(this)
  }
}

module.exports = ExecCore
