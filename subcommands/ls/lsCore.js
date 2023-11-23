const path = require('path')
const Table = require('cli-table3')
const { AsyncSeriesHook } = require('tapable')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const { lsColors, lsHead } = require('./utils')
const ConfigFactory = require('../../utils/configManagers/configFactory')

/**
 * @class
 */
class LsCore {
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
    this.colors = lsColors
    this.head = lsHead
    this.colorMap = new Map()
    this.lsTable = new Table()
    this.syncedBlockIds = null

    this.hooks = {
      beforeLs: new AsyncSeriesHook(['context', 'logger']),
      afterLs: new AsyncSeriesHook(['context', 'logger']),
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

  async ls() {
    this.logger.info('ls command')

    await this.hooks.beforeLs?.promise(this, this.logger)

    console.log(this.lsTable.toString())

    await this.hooks.afterLs?.promise(this, this.logger)
  }
}

module.exports = LsCore
