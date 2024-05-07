const { AsyncSeriesHook } = require('tapable')
const { post } = require('../../utils/axios')
const { configstore } = require('../../configstore')
const { appBlockLogout } = require('../../utils/api')

/**
 * @class
 */
class LogoutCore {
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
    this.logoutFiles = []

    this.hooks = {
      beforeLogout: new AsyncSeriesHook(['context']),
      afterLogout: new AsyncSeriesHook(['context']),
    }
  }

  async logout() {
    this.logger.info('logout command')

    await this.hooks.beforeLogout?.promise(this)

    this.spinnies.add('logout', { text: 'Connecting to shield..' })
    try {
      const { data } = await post(appBlockLogout, {})
      if (!data.success) throw new Error(data.message || 'Error logging out of shield')
    } catch (error) {
      throw new Error('Error logging out of shield')
    }

    this.spinnies.succeed('logout', { text: 'Logged out of shield' })
    configstore.delete('appBlockUserName')
    configstore.delete('appBlockUserToken')
    configstore.delete('currentSpaceId')
    configstore.delete('currentSpaceName')
    configstore.delete('awsCredConfig')

    await this.hooks.afterLogout?.promise(this)
  }
}

module.exports = LogoutCore
