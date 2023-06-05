/* eslint-disable no-continue */
const { mkdir, writeFile } = require('fs/promises')
const path = require('path')
const { AsyncSeriesHook } = require('tapable')
const { blockTypeInverter } = require('../../utils/blockTypeInverter')

// eslint-disable-next-line no-unused-vars
const { spinnies } = require('../../loader')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const PackageConfigManager = require('../../utils/configManagers/packageConfigManager')
const { BB_CONFIG_NAME } = require('../../utils/constants')

//
class CreateCore {
  constructor(blockName, cmdOptions, options) {
    this.cmdArgs = { blockName }
    this.cmdOpts = { ...cmdOptions }

    this.logger = options.logger
    /**
     * @type {spinnies}
     */
    this.spinnies = options.spinnies

    this.cwd = process.cwd()
    this.blockDetails = {}
    this.packageManager = {}
    this.isOutOfContext = false

    this.hooks = {
      beforeCreate: new AsyncSeriesHook(['core']),
      beforeConfigUpdate: new AsyncSeriesHook(['core']),
      afterCreate: new AsyncSeriesHook(['core']),
    }
  }

  async initializePackageConfigManager() {
    const configPath = path.resolve(BB_CONFIG_NAME)
    const { manager: configManager, error } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      this.isOutOfContext = true
    } else if (configManager instanceof PackageConfigManager) {
      this.packageManager = configManager
      this.packageConfig = this.packageManager.config
    } else throw new Error('Cannot use create command inside another block')
  }

  async createBlock() {
    // beforeCreate hook
    await this.hooks.beforeCreate?.promise(this)

    this.spinnies.add('create', { text: `creating block` })

    this.blockFolderPath = path.join(this.cwd, this.cmdArgs.blockName)
    this.blockConfigPath = path.join(this.blockFolderPath, BB_CONFIG_NAME)

    try {
      await mkdir(this.blockFolderPath)
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      throw new Error(`${this.cmdArgs.blockName} folder already exist`)
    }

    this.repoType = this.packageConfig.repoType

    this.blockDetails = {
      name: this.cmdArgs.blockName,
      type: blockTypeInverter(this.cmdOpts.type),
      source: {
        ...this.packageConfig.source,
        branch: `orphan-${this.cmdArgs.blockName}`,
      },
      repoType: this.repoType,
      language: this.cmdOpts.language,
      supportedAppblockVersions: this.packageConfig.supportedAppblockVersions,
    }

    await this.hooks.beforeConfigUpdate?.promise(this)
    // template setup hooks

    await writeFile(this.blockConfigPath, JSON.stringify(this.blockDetails, null, 2))
    const { error } = await this.packageManager.addBlock(this.blockConfigPath)
    if (error) throw error

    // afterCreate hook
    await this.hooks.afterCreate?.promise(this)

    this.spinnies.succeed('create', { text: `Successfully created ${this.cmdArgs.blockName} block` })
  }
}

module.exports = CreateCore
