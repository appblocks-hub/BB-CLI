const { AsyncSeriesHook } = require('tapable')
const GitConfigFactory = require('../../utils/gitManagers/gitConfigFactory')

/**
 * @class
 */
class ConnectCore {
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

    this.hooks = {
      beforeConnect: new AsyncSeriesHook(['context']),
      afterConnect: new AsyncSeriesHook(['context']),
    }
  }

  async connect() {
    this.logger.info('connect command')

    await this.hooks.beforeConnect?.promise(this)
    const { error, manager } = await GitConfigFactory.init({ gitVendor: this.cmdArgs[0] })
    if (error) throw error

    await manager.connect(this.cmdOpts)

    await this.hooks.afterConnect?.promise(this)
  }
}

module.exports = ConnectCore
