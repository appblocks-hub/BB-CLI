const path = require('path')
const { AsyncSeriesHook } = require('tapable')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const { createRepo } = require('../../utils/createRepo')
const convertGitUrl = require('../../utils/convertGitUrl')

/**
 * @class
 */
class ConnectRemoteCore {
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
    this.source = {}

    this.hooks = {
      beforeConnectRemote: new AsyncSeriesHook(['context']),
      afterConnectRemote: new AsyncSeriesHook(['context']),
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

  async connectRemote() {
    this.logger.info('connectRemote command')

    await this.hooks.beforeConnectRemote?.promise(this)

    let { sourceUrl } = this.cmdOpts || {}

    if (!sourceUrl) {
      const createRes = await createRepo(this.manager.config.name)
      sourceUrl = createRes.sshUrl
    }

    this.source = {
      ...this.manager.config.source,
      ssh: convertGitUrl(sourceUrl, 'ssh'),
      https: convertGitUrl(sourceUrl),
    }

    await this.hooks.afterConnectRemote?.promise(this)

    this.spinnies.add('cr', { text: 'Adding source' })
    this.spinnies.succeed('cr', { text: 'Successfully added source to blocks' })
  }
}

module.exports = ConnectRemoteCore
