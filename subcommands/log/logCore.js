const path = require('path')
const { AsyncSeriesHook } = require('tapable')
const { existsSync, watchFile } = require('fs')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')
const { readOldLog, readLog } = require('./utils')

/**
 * @class
 */
class LogCore {
  /**
   * @param {string} appBlockName
   * @param {} options
   */
  constructor(blockName, options, logger, spinnies) {
    this.cwd = process.cwd()

    this.cmdArgs = [blockName]
    this.cmdOpts = options
    this.logger = logger
    this.spinnies = spinnies

    this.manager = {}
    this.filesToWatch= []

    this.hooks = {
      beforeLog: new AsyncSeriesHook(['context', 'logger']),
      afterLog: new AsyncSeriesHook(['context', 'logger']),
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async initializeConfigManager() {
    const configPath = path.resolve(BB_CONFIG_NAME)
    const { manager, error } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      throw new Error('Please run the command inside package context')
    }

    if (manager instanceof BlockConfigManager) {
      throw new Error('Please run the command inside package context ')
    }

    this.manager = manager
  }

  async log() {
    this.logger.info('log command')

    await this.hooks.beforeLog?.promise(this, this.logger)

    this.filesToWatch.forEach((filePath) => {
      if (!existsSync(filePath)) return
      readOldLog(filePath, this.cmdOpts?.lines)
      watchFile(filePath, { persistent: true, interval: 500 }, (currStat, prevStat) => {
        if (currStat.size === prevStat.size) return
        readLog(filePath, prevStat.size, currStat.size)
      })
    })

    await this.hooks.afterLog?.promise(this, this.logger)
    console.log(`\n... watching logs ...\n`)
  }
}

module.exports = LogCore
