// eslint-disable-next-line no-unused-vars
const StartCore = require('../stopCore')

class HandleOutOfContext {
  // eslint-disable-next-line class-methods-use-this
  apply(stopCore) {
    stopCore.hooks.beforeStop.tapPromise(
      'HandleOutOfContext',
      async (
        /**
         * @type {StartCore}
         */
        core
      ) => {
        if (!core.isOutOfContext) return
        throw new Error('Please run the command inside a package context')

        // TODO: handle global stop from outside context
      }
    )
  }
}
module.exports = HandleOutOfContext
