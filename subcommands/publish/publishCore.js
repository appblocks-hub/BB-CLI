const path = require('path')
const { readFileSync } = require('fs')
const { AsyncSeriesHook } = require('tapable')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')
const { publishBlockApi, createSourceCodeSignedUrl } = require('../../utils/api')
const { post } = require('../../utils/axios')
const { axios } = require('../../utils/axiosInstances')

/**
 * @class
 */
class PublishCore {
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
    this.zipFile = null
    this.versionData = {}
    this.sourceCodeData = {}
    this.publishData = {}

    this.hooks = {
      beforePublish: new AsyncSeriesHook(['context']),
      afterPublish: new AsyncSeriesHook(['context']),
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

  async publish() {
    this.logger.info('publish command')

    await this.hooks.beforePublish?.promise(this)

    this.spinnies.add('publish', { text: 'Preparing block' })

    const { data: preSignedData, error } = await post(createSourceCodeSignedUrl, this.sourceCodeData)

    if (error) throw error

    const zipFileData = readFileSync(this.zipFile)

    await axios.put(preSignedData.url, zipFileData, {
      headers: { 'Content-Type': 'application/zip' },
    })

    this.publishData.source_code_key = preSignedData.key

    this.spinnies.add('publish', { text: 'Publishing block' })
    const { error: pubErr } = await post(publishBlockApi, this.publishData)
    if (pubErr) throw pubErr
    this.spinnies.succeed('publish', { text: 'Successfully published block' })

    await this.hooks.afterPublish?.promise(this)
  }
}

module.exports = PublishCore
