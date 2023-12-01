/* eslint-disable class-methods-use-this */

class HandleBeforeDisconnect {
  /**
   *
   * @param {DisconnectCore} core
   */
  apply(disconnectCore) {
    disconnectCore.hooks.beforeDisconnect.tapPromise('HandleBeforeDisconnect', async () => {})
  }
}

module.exports = HandleBeforeDisconnect
