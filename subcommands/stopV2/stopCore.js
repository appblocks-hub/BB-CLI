const path = require('path')
const { AsyncSeriesHook } = require('tapable')

const ConfigFactory = require('../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const { treeKillSync } = require('../../utils')

class StopCore {
  /**
   * @type {}
   */

  constructor(blockNames, options, appConfig) {
    this.cmdArgs = blockNames
    this.cmdOpts = options
    this.appConfig = appConfig
    this.blocksToStop = []

    this.hooks = {
      beforeStop: new AsyncSeriesHook(['core']),
      afterStop: new AsyncSeriesHook(['core']),
    }
  }

  async initializeConfigManager() {
    const configPath = path.resolve(BB_CONFIG_NAME)
    const { manager: configManager, error } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      this.isOutOfContext = true
    } else if (configManager instanceof PackageConfigManager) {
      this.packageManager = configManager
      this.packageConfig = this.packageManager.config
    } else throw new Error('Not inside a package context')
  }

  async stop() {
    await this.hooks.beforeStop.promise(this)

    for (const blockManager of this.blocksToStop) {
      const { pid } = blockManager.liveDetails
      const { name } = blockManager.config

      try {
        await treeKillSync(pid)
        blockManager.updateLiveConfig({
          pid: null,
          isOn: false,
          singleInstance: false,
        })
      } catch (error) {
        console.log(`Error stopping ${name} block process with pid `, pid)
      }
    }
    console.log(`Blocks stopped successfully!`)

    await this.hooks.afterStop.promise(this)
  }
}

module.exports = StopCore
