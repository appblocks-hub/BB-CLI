/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const { configstore } = require('../../../configstore')
const { feedback } = require('../../../utils/cli-feedback')

class HandleDelete {
  /**
   *
   * @param {ConfigCore} core
   */
  apply(configCore) {
    configCore.hooks.beforeConfig.tapPromise('HandleDelete', async (core) => {
      const { cmdOpts } = core
      const deleteValue = cmdOpts?.delete
      if (!deleteValue) return

      if (!configstore.has(deleteValue)) {
        feedback({ type: 'error', message: `${deleteValue} is not a key in config` })
        return
      }
      configstore.delete(deleteValue)
      
      core.store = configstore.store
    })
  }
}

module.exports = HandleDelete
