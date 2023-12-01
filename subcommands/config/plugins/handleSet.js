/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const { configstore } = require('../../../configstore')
const { feedback } = require('../../../utils/cli-feedback')

class HandleSet {
  /**
   *
   * @param {ConfigCore} core
   */
  apply(configCore) {
    configCore.hooks.beforeConfig.tapPromise('HandleSet', async (core) => {
      const { cmdOpts } = core
      const { set } = cmdOpts || {}
      if (!set) return

      for (const optKey in set) {
        if (Object.hasOwnProperty.call(set, optKey)) {
          let element = set[optKey]

          if (element === 'true' || element === 'false') {
            element = element === 'true'
          }

          if (configstore.has(optKey)) {
            feedback({ type: 'info', message: `${optKey} is already present with value ${configstore.get(optKey)}` })
            feedback({ type: 'info', message: `changing value to ${element}` })
            configstore.set(optKey, element)
            feedback({ type: 'success', message: 'value changed' })
          } else {
            configstore.set(optKey, element)
            feedback({ type: 'success', message: `${optKey} with value ${element} added to config` })
          }
        }
      }
      core.store = configstore.store
    })
  }
}

module.exports = HandleSet
