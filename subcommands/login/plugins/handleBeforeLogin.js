/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const chalk = require('chalk')
const { configstore } = require('../../../configstore')
const { getShieldSignedInUser } = require('../../../utils/getSignedInUser')

class HandleBeforeLogin {
  /**
   *
   * @param {LoginCore} core
   */
  apply(loginCore) {
    loginCore.hooks.beforeLogin.tapPromise('HandleBeforeLogin', async () => {
      const presentTOKEN = configstore.get('appBlockUserToken', '')

      if (presentTOKEN) {
        const { user } = await getShieldSignedInUser(presentTOKEN)
        if (user && user === configstore.get('appBlockUserName', '')) {
          throw new Error(chalk.green(`Already signed in as ${user}`))
        }
      }
    })
  }
}

module.exports = HandleBeforeLogin
