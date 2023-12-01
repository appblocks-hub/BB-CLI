const { AsyncSeriesHook } = require('tapable')
const GitConfigFactory = require('../../utils/gitManagers/gitConfigFactory')

/**
 * @class
 */
class DisconnectCore {
  /**
   * @param {} options
   */
  constructor(service, options, logger, spinnies) {
    this.cwd = process.cwd()

    this.cmdArgs = [service]
    this.cmdOpts = options
    this.logger = logger
    this.spinnies = spinnies

    this.manager = {}
    this.disconnectFiles = []

    this.hooks = {
      beforeDisconnect: new AsyncSeriesHook(['context']),
      afterDisconnect: new AsyncSeriesHook(['context']),
    }
  }

  async disconnect() {
    this.logger.info('disconnect command')

    await this.hooks.beforeDisconnect?.promise(this)

    const { error, manager } = await GitConfigFactory.init({ gitVendor: this.cmdArgs[0] })
    if (error) throw error

    await manager.disconnect()

    await this.hooks.afterDisconnect?.promise(this)
  }
}

module.exports = DisconnectCore
