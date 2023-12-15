/**
 * Action for bb-start
 */

const path = require('path')
const { AsyncSeriesHook } = require('tapable')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')
// eslint-disable-next-line no-unused-vars
const { feedback } = require('../../utils/cli-feedback')
// eslint-disable-next-line no-unused-vars
const { Logger } = require('../../utils/logger')
// eslint-disable-next-line no-unused-vars
const { spinnies } = require('../../loader')
const { BB_CONFIG_NAME } = require('../../utils/constants')

/**
 * What does start do?
 *
 */
class StartCore {
  /**
   * Create a start factory
   * @param {import('../../utils/jsDoc/types').cmdStartArgs} blockName
   * @param {import('../../utils/jsDoc/types').cmdStartOptions} options
   */
  constructor(blockName, options) {
    this.cmdArgs = { blockName }
    this.cmdOpts = { ...options }
    this.cwd = process.cwd()

    this.subPackages = {}
    this.envWarning = {
      keys: [],
      prefixes: [],
    }

    /**
     * @type {Logger}
     */
    this.logger = options.logger
    /**
     * @type {feedback}
     */
    this.feedback = options.feedback
    /**
     * @type {spinnies}
     */
    this.spinnies = options.spinnies

    /**
     * @type {Array<string>}
     */
    this.blocksToStart = []
    /**
     * @type {Iterable<{type:string,blocks:Array}>}>}
     */
    this.blockStartGroups = {}

    this.middlewareBlockList = []
    this.middlewareBlockNames = []

    this.packageManager = {}
    this.packageConfig = {}
    this.functionsToStart = []

    this.hooks = {
      beforeStart: new AsyncSeriesHook(['core']),
      afterStart: new AsyncSeriesHook(['core']),
    }
  }

  async initializeConfigManager() {
    const configPath = path.resolve(BB_CONFIG_NAME)
    const { manager: configManager, error } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      this.isOutOfContext = true
    } else if (configManager instanceof PackageConfigManager) {
      await configManager.refreshConfig()
      this.packageManager = configManager
      this.packageConfig = this.packageManager.config
    } else throw new Error('Not inside a package context')
  }

  async start() {
    // beforeCreate hook
    await this.hooks.beforeStart?.promise(this, this.packageManager)

    // Execute each function in the array
    for (const func of this.functionsToStart) {
      await func() // Call the function
    }
    
    // afterCreate hook
    await this.hooks.afterStart?.promise(this, this.packageManager)
  }

  /**
   * Frees the used locked ports
   */
  async cleanUp() {
    if (JSON.stringify(this.blockStartGroups) === '{}') return
    for (const { blocks } of this.blockStartGroups) {
      for (const { portKey } of blocks) {
        if (portKey) portKey.abort()
      }
    }
  }
}

module.exports = StartCore
