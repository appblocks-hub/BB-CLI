const { AsyncSeriesHook } = require('tapable')
const path = require('path')

const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const { appBlockAddVersion } = require('../../utils/api')
const { post } = require('../../utils/axios')
const { uploadBlockReadme } = require('./utils')
const { ensureReadMeIsPresent } = require('../../utils/fileAndFolderHelpers')

/**
 * @class
 */
class CreateVersionCore {
  /**
   * @param {string} appBlockName
   * @param {} options
   */
  constructor(component, options, logger, spinnies) {
    this.cwd = process.cwd()

    this.cmdArgs = [component]
    this.cmdOpts = options
    this.logger = logger
    this.spinnies = spinnies

    this.manager = {}
    this.versionData = {}
    this.createVersionData = {}
    
    this.hooks = {
      beforeCreateVersion: new AsyncSeriesHook(['context', 'logger']),
      afterCreateVersion: new AsyncSeriesHook(['context', 'logger']),
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

  async createVersion() {
    this.logger.info('createVersion command')

    await this.hooks.beforeCreateVersion?.promise(this, this.logger)

    const [readmePath] = ensureReadMeIsPresent(this.manager.directory, this.manager.config.name, false)
    if (!readmePath) throw new Error('Make sure to add a README.md ')

    this.spinnies.add('cv', { text: 'Creating version' })
    const { data: addRes, error: addErr } = await post(appBlockAddVersion, this.createVersionData)

    if (addErr) throw addErr

    const versionId = addRes?.data?.id
    await uploadBlockReadme({ readmePath, blockId: this.createVersionData.blockId, versionId })

    await this.hooks.afterCreateVersion?.promise(this, this.logger)
    this.spinnies.succeed('cv', { text: 'Version created successfully' })
  }
}

module.exports = CreateVersionCore
