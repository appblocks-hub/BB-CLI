/* eslint-disable class-methods-use-this */

class HandleBeforeConnect {
  /**
   *
   * @param {ConnectCore} core
   */
  apply(connectCore) {
    connectCore.hooks.beforeConnect.tapPromise('HandleBeforeConnect', async () => {})
  }
}

module.exports = HandleBeforeConnect
