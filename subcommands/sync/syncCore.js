const path = require('path')
const chalk = require('chalk')
const { AsyncSeriesHook } = require('tapable')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')
const { BB_FOLDERS, getBBFolderPath } = require('../../utils/bbFolders')
const { updateSyncLogs } = require('./utils')
const { post } = require('../../utils/axios')
const { singleBlockSync, blocksSync } = require('../../utils/api')

/**
 * @class
 */
class SyncCore {
  /**
   * @param {string} appBlockName
   * @param {} options
   */
  constructor(blockName, options, logger, spinnies) {
    this.cwd = process.cwd()

    this.cmdArgs = [blockName]
    this.cmdOpts = options
    this.logger = logger
    this.spinnies = spinnies

    this.manager = {}
    this.preview = false
    this.bbModulesPath = getBBFolderPath(BB_FOLDERS.BB_MODULES)
    this.bbModulesData = {}
    this.createBBModulesData = {}
    this.syncLogs = {}

    this.hooks = {
      beforeSync: new AsyncSeriesHook(['context']),
      afterSync: new AsyncSeriesHook(['context']),
    }
  }

  // eslint-disable-next-line class-methods-use-this
  async initializeConfigManager() {
    const configPath = path.resolve(BB_CONFIG_NAME)
    const { manager, error } = await ConfigFactory.create(configPath)
    if (error) {
      if (error.type !== 'OUT_OF_CONTEXT') throw error
      throw new Error('Please run the command inside package context')
    }

    if (manager instanceof BlockConfigManager) {
      throw new Error('Please run the command inside package context ')
    }

    this.manager = manager
  }

  async sync() {
    this.logger.info('sync command')

    await this.hooks.beforeSync?.promise(this)

    const { returnOnError } = this.cmdOpts || {}

    // Return if there are nothing to pull
    if (this.bbModulesData.noPullChanges && returnOnError) return

    const { SYNC_LOGS } = BB_FOLDERS
    const syncLogDirectory = getBBFolderPath(SYNC_LOGS)

    const { blockNameArray, apiPayload, rootPackageBlockID, rootPackageName } = this.bbModulesData

    const postData = {
      block_meta_data_map: apiPayload,
      block_name_array: blockNameArray,
      root_package_block_id: rootPackageBlockID,
      root_package_name: rootPackageName,
    }

    const { data, error } = await post(this.cmdArgs[0] ? singleBlockSync : blocksSync, postData, {
      space_id: this.bbModulesData.currentSpaceID,
    })

    const resData = data?.data
    const errMsg = error?.response?.data?.msg || 'Sync Api Failed'

    // eslint-disable-next-line no-param-reassign
    this.syncLogs.apiLogs = {
      non_available_block_names: resData?.non_available_block_names_map ?? {},
      error: (error || resData?.err) ?? true,
      message: error ? errMsg : resData.msg || '',
    }
    updateSyncLogs(syncLogDirectory, this.syncLogs)

    if (error) {
      throw new Error(
        `${errMsg}\n${chalk.gray(`Please check ${BB_FOLDERS.BB}/${BB_FOLDERS.SYNC_LOGS} for more details`)}`
      )
    }

    await this.hooks.afterSync?.promise(this)
  }
}

module.exports = SyncCore
