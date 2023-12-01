/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const chalk = require('chalk')
const { configstore } = require('../../../configstore')

class HandleBeforeLogout {
  /**
   *
   * @param {LogoutCore} core
   */
  apply(logoutCore) {
    logoutCore.hooks.beforeLogout.tapPromise('HandleBeforeLogout', async () => {
      if (!configstore.get('appBlockUserToken', '')) {
        throw new Error(chalk.red('No user logged in'))
      }
    })
  }
}

module.exports = HandleBeforeLogout
