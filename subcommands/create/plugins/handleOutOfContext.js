/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

// eslint-disable-next-line no-unused-vars
const { BB_CONFIG_NAME } = require('../../../utils/constants')
// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class HandleOutOfContext {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.beforeCreate.tapPromise(
      'HandleOutOfContext',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        if (!core.isOutOfContext) return
        throw new Error(`Cannot use create command outside package context.`)
      }
    )
  }
}
module.exports = HandleOutOfContext
