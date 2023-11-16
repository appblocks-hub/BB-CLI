const { AsyncSeriesHook } = require('tapable')
const path = require('path')
const chalk = require('chalk')

const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const { pExec } = require('../../utils')

/**
 * @class
 */
class RunTestCore {
  /**
   * @param {string} appBlockName
   * @param {} options
   */
  constructor(options, logger) {
    this.cwd = process.cwd()

    this.cmdArgs = []
    this.cmdOpts = options
    this.logger = logger

    this.command = 'npm run test'
    this.pathList = []
    this.manager = {}

    this.hooks = {
      beforeRunTest: new AsyncSeriesHook(['context', 'logger']),
      afterRunTest: new AsyncSeriesHook(['context', 'logger']),
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async initializeConfigManager() {
    const configPath = path.resolve(BB_CONFIG_NAME)
    const { error, manager } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      throw new Error('command can be used only inside appblocks context')
    }
    this.manager = manager
  }

  async runTest() {
    this.logger.info('runTest command')

    await this.hooks.beforeRunTest?.promise(this, this.logger)

    console.log(`\ntests will be run in the following blocks\n`)
    this.pathList.forEach((v) => {
      console.log(`${chalk.blue(v.config.name)} : ${chalk.italic(v.directory)}`)
      this.logger.info(v.directory)
    })
    console.log('\n')
    await Promise.allSettled(this.pathList.map((l) => pExec(this.command, { cwd: l.directory }, l.config.name))).then(
      (res) => {
        res.forEach((v) => {
          const colour = v.value.err ? chalk.red : chalk.green
          console.log('\n\n', colour(v.value.data), ' : ', colour(v.value.err ? v.value.err : 'Passed'), v.value.out)
        })
      }
    )

    await this.hooks.afterRunTest?.promise(this, this.logger)
  }
}

module.exports = RunTestCore
