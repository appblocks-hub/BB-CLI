// eslint-disable-next-line no-unused-vars
const StartCore = require('../startCore')

class HandleOutOfContext {
  // eslint-disable-next-line class-methods-use-this
  apply(startCore) {
    startCore.hooks.beforeStart.tapPromise(
      'HandleOutOfContext',
      async (
        /**
         * @type {StartCore}
         */
        core
      ) => {
        if (!core.isOutOfContext) return
        throw new Error('Please run the command inside a package context')

        // TODO: handle global start from outside context
      }
    )
  }
}
module.exports = HandleOutOfContext
