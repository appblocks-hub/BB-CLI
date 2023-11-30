const path = require('path')
const { execSync } = require('child_process')
const { AsyncSeriesHook } = require('tapable')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')

/**
 * @class
 */
class FlushCore {
  /**
   * @param {} options
   */
  constructor(options, logger, spinnies) {
    this.cwd = process.cwd()

    this.cmdArgs = []
    this.cmdOpts = options
    this.logger = logger
    this.spinnies = spinnies

    this.manager = {}
    this.flushFiles = []

    this.hooks = {
      beforeFlush: new AsyncSeriesHook(['context']),
      afterFlush: new AsyncSeriesHook(['context']),
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

  async flush() {
    this.logger.info('flush command')

    await this.hooks.beforeFlush?.promise(this)

    if (this.flushFiles?.length > 0) {
      this.spinnies.add('flush', { text: 'Clearing logs' })
      this.flushFiles.forEach((p) => {
        this.spinnies.update('flush', { text: `Clearing logs of ${path.basename(p)}` })
        execSync(`rm -r ${p}`)
      })
      this.spinnies.succeed('flush', { text: `Logs removed successfully` })
    }

    await this.hooks.afterFlush?.promise(this)
  }
}

module.exports = FlushCore
