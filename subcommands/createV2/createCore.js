/* eslint-disable no-continue */
const { mkdir, writeFile } = require('fs/promises')
const path = require('path')
const { AsyncSeriesHook } = require('tapable')
const { appConfig } = require('../../utils/appconfigStore')
const { blockTypeInverter } = require('../../utils/blockTypeInverter')

// eslint-disable-next-line no-unused-vars
const { spinnies } = require('../../loader')

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
    this.appConfig = {}
    this.blockDetails = {}

    this.hooks = {
      beforeCreate: new AsyncSeriesHook(['core']),
      afterCreate: new AsyncSeriesHook(['core']),
    }
  }

  async initializeAppConfig() {
    await appConfig.initV2(this.cwd, null, 'create')
    this.appConfig = appConfig
  }

  async createBlock() {
    // beforeCreate hook
    await this.hooks.beforeCreate?.promise(this)

    const { blockName } = this.cmdArgs
    const { type, language } = this.cmdOpts
    this.blockFolderPath = path.join(this.cwd, blockName)
    const blockConfigPath = path.join(this.blockFolderPath, 'block.config.json')

    await mkdir(this.blockFolderPath, { recursive: true })

    const parentPackageConfig = this.appConfig?.config
    // if (!this.parentPackagePath) {
    //   const { data, err } = await findMyParentPackage(blockName, blockConfigPath, 'block.config.json')
    //   if (err) throw err
    //   parentPackageConfig = data.parentPackageConfig
    // await appConfig.initV2(data.parent, null, 'create', { reConfig: true })
    // this.appConfig = appConfig
    // }

    this.repoType = parentPackageConfig.repoType

    this.blockDetails = {
      name: blockName,
      type: blockTypeInverter(type),
      source: {
        ...parentPackageConfig.source,
        branch: `orphan-${blockName}`,
      },
      repoType: this.repoType,
      language,
      supportedAppblockVersions: parentPackageConfig.supportedAppblockVersions,
    }

    // template setup hooks
    await writeFile(blockConfigPath, JSON.stringify(this.blockDetails, null, 2))
    appConfig.addBlock({ directory: blockName, meta: this.blockDetails })

    // afterCreate hook
    await this.hooks.afterCreate?.promise(this)
  }
}

module.exports = CreateCore
