const path = require('path')
const { AsyncSeriesHook } = require('tapable')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const { sellFreeBlock } = require('./utils')

/**
 * @class
 */
class PublishToStoreCore {
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
    this.publishData = {}

    this.hooks = {
      beforePublishToStore: new AsyncSeriesHook(['context']),
      afterPublishToStore: new AsyncSeriesHook(['context']),
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

  async publishToStore() {
    this.logger.info('publishToStore command')

    await this.hooks.beforePublishToStore?.promise(this)

    const submissionData = await sellFreeBlock(this.publishData)

    console.log(`Block published to store successfully.Submission ID is ${submissionData}`)

    await this.hooks.afterPublishToStore?.promise(this)
  }
}

module.exports = PublishToStoreCore
