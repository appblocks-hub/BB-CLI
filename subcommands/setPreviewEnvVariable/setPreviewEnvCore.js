const path = require('path')
const { AsyncSeriesHook } = require('tapable')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')
const { post } = require('../../utils/axios')
const { upsertPreviewEnvVariable } = require('../../utils/api')

/**
 * @class
 */
class SetPreviewEnvCore {
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
    this.variableData = []
    this.blockVersionId = ''

    this.hooks = {
      beforeSetPreviewEnv: new AsyncSeriesHook(['context']),
      afterSetPreviewEnv: new AsyncSeriesHook(['context']),
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

    if (manager instanceof BlockConfigManager) {
      throw new Error('Please run the command inside package')
    }

    this.manager = manager
  }

  async setPreviewEnv() {
    this.logger.info('setPreviewEnv command')

    await this.hooks.beforeSetPreviewEnv?.promise(this)

    this.spinnies.add('bv', { text: `Saving environment variables` })
    const { error } = await post(upsertPreviewEnvVariable, {
      variables: this.variableData,
      block_version_id: this.blockVersionId,
    })

    if (error) {
      this.spinnies.remove('bv')
      throw error
    }
    
    await this.hooks.afterSetPreviewEnv?.promise(this)

    this.spinnies.succeed('bv', { text: 'Environment variables saved successfully' })
  }
}

module.exports = SetPreviewEnvCore
