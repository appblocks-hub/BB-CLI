/* eslint-disable no-continue */
const { mkdir, writeFile } = require('fs/promises')
const path = require('path')
const { dim } = require('chalk')
const { AsyncSeriesHook } = require('tapable')
const { appConfig } = require('../../utils/appconfigStore')
const { blockTypeInverter } = require('../../utils/blockTypeInverter')

// eslint-disable-next-line no-unused-vars
const { spinnies } = require('../../loader')
const { findMyParentPackage } = require('../../utils')

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
    this.parentPackagePath = null
    this.blockDetails = {}

    this.hooks = {
      beforeCreate: new AsyncSeriesHook(['core']),
      beforeConfigUpdate: new AsyncSeriesHook(['core']),
      afterCreate: new AsyncSeriesHook(['core']),
    }
  }

  async initializeAppConfig() {
    await appConfig.initV2(this.cwd, null, 'create')
    this.appConfig = appConfig || {}
  }

  async createBlock() {
    // beforeCreate hook
    await this.hooks.beforeCreate?.promise(this)

    this.blockFolderPath = path.join(this.cwd, this.cmdArgs.blockName)
    this.blockConfigPath = path.join(this.blockFolderPath, 'block.config.json')

    try {
      await mkdir(this.blockFolderPath)
    } catch (error) {
      if (error.code !== 'EEXIST') throw error

      throw new Error(`${this.cmdArgs.blockName} folder already exist`)
    }

    let parentPackageConfig = this.appConfig?.config
    if (this.parentPackagePath) {
      const { data, err } = await findMyParentPackage(this.cmdArgs.blockName, this.blockConfigPath, 'block.config.json')
      if (err) throw err
      parentPackageConfig = data.parentPackageConfig
      await appConfig.initV2(data.parent, null, 'create', { reConfig: true })
      this.appConfig = appConfig
    }

    this.repoType = parentPackageConfig.repoType

    this.blockDetails = {
      name: this.cmdArgs.blockName,
      type: blockTypeInverter(this.cmdOpts.type),
      source: {
        ...parentPackageConfig.source,
        branch: `orphan-${this.cmdArgs.blockName}`,
      },
      repoType: this.repoType,
      language: this.cmdOpts.language,
      supportedAppblockVersions: parentPackageConfig.supportedAppblockVersions,
    }

    await this.hooks.beforeConfigUpdate?.promise(this)
    // template setup hooks
    await writeFile(this.blockConfigPath, JSON.stringify(this.blockDetails, null, 2))
    appConfig.addBlock({ directory: this.cmdArgs.blockName, meta: this.blockDetails })

    // afterCreate hook
    await this.hooks.afterCreate?.promise(this)

    console.log(dim(`Successfully created ${this.cmdArgs.blockName} block`))
  }
}

module.exports = CreateCore
