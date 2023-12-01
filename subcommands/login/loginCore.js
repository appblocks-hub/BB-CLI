const { AsyncSeriesHook } = require('tapable')
const { loginWithAppBlock } = require('../../auth')
const { getShieldSignedInUser } = require('../../utils/getSignedInUser')
const { configstore } = require('../../configstore')
const { feedback } = require('../../utils/cli-feedback')

/**
 * @class
 */
class LoginCore {
  /**
   * @param {} options
   */
  constructor(options, logger, spinnies) {
    this.cwd = process.cwd()

    this.cmdArgs = []
    this.cmdOpts = options
    this.logger = logger
    this.spinnies = spinnies

    this.hooks = {
      beforeLogin: new AsyncSeriesHook(['context']),
      afterLogin: new AsyncSeriesHook(['context']),
    }
  }

  async login() {
    this.logger.info('login command')

    await this.hooks.beforeLogin?.promise(this)

    const { localhost } = this.cmdOpts
    const { data } = await loginWithAppBlock(localhost)
    configstore.set('appBlockUserToken', data.access_token)
    const { user } = await getShieldSignedInUser(data.access_token)
    configstore.set('appBlockUserName', user)

    feedback({ type: 'success', message: `Successfully logged in as ${user}` })

    await this.hooks.afterLogin?.promise(this)
  }
}

module.exports = LoginCore
