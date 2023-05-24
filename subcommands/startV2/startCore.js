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
const { Logger } = require('../../utils/loggerV2')
// eslint-disable-next-line no-unused-vars
const { spinnies } = require('../../loader')

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
    this.hooks = {
      beforeStart: new AsyncSeriesHook(['core', 'packageConfigManager']),
      afterStart: new AsyncSeriesHook(['core', 'packageConfigManager']),
      /**
       * Find free ports for each block in group here,
       * preferably consecutive numbers for blocks in one group
       */
      buildEmulator: '',
      buildFnEmulator: new AsyncSeriesHook(['core', 'config']),
      buildJobEmulator: new AsyncSeriesHook(['core', 'config']),
      buildSharedFnEmulator: new AsyncSeriesHook(['core', 'config']),
      singleBuildForView: new AsyncSeriesHook(['core', 'config']),
      /**
       * Building emulator is totally in hands of user of this class
       */
    }
  }

  async initializeConfigManager() {
    const configPath = path.resolve('block.config.json')
    const { manager: configManager, error } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      this.isOutOfContext = true
    } else if (configManager instanceof PackageConfigManager) {
      this.packageConfigManager = configManager
      this.packageConfig = this.packageConfigManager.config
    } else throw new Error('Not inside a package context')
  }

  async start() {
    // beforeCreate hook
    await this.hooks.beforeStart?.promise(this, this.packageConfigManager)

    // common core functionality if any

    // beforeCreate hook
    await this.hooks.afterStart?.promise(this, this.packageConfigManager)
  }

  /**
   * Frees the used locked ports
   */
  async cleanUp() {
    for (const { blocks } of this.blockStartGroups) {
      blocks.forEach((v) => v.key?.abort())
    }
    process.exitCode = 0
  }
}

module.exports = StartCore
