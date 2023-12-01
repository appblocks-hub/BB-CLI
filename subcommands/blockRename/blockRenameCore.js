const path = require('path')
const { AsyncSeriesHook } = require('tapable')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')

/**
 * @class
 */
class BlockRenameCore {
  /**
   * @param {} options
   */
  constructor(blockName, newBlockName, options, logger, spinnies) {
    this.cwd = process.cwd()

    this.cmdArgs = [blockName, newBlockName]
    this.cmdOpts = options
    this.logger = logger
    this.spinnies = spinnies

    this.manager = {}
    this.blockRenameFiles = []

    this.hooks = {
      beforeBlockRename: new AsyncSeriesHook(['context']),
      afterBlockRename: new AsyncSeriesHook(['context']),
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

  async blockRename() {
    this.logger.info('blockRename command')

    await this.hooks.beforeBlockRename?.promise(this)

    await this.hooks.afterBlockRename?.promise(this)
  }
}

module.exports = BlockRenameCore
