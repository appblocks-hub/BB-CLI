/* eslint-disable no-unused-vars */
// eslint-disable-next-line no-unused-vars
const chalk = require('chalk')
const StartCore = require('../startCore')

class HandleAfterStart {
  // eslint-disable-next-line class-methods-use-this
  apply(startCore) {
    startCore.hooks.afterStart.tapPromise(
      'HandleAfterStart',
      async (
        /**
         * @type {StartCore}
         */
        core
      ) => {
        // common core functionality if any
        if (core.envWarning.keys?.length > 0) {
          const keys = [...new Set(core.envWarning.keys)]
          const prefixes = [...new Set(core.envWarning.prefixes)]

          const affectedKeys = chalk.dim(`Environment keys affected: ${keys}`)
          const exampleKey = keys[0]?.startsWith('BB_') ? keys[0].replace('BB_', '') : keys[0]
          const egString = chalk.dim(
            `Example: ${prefixes.map((pre) => `${pre}_${exampleKey} instead of ${keys[0]}`).join(' or ')}.`
          )
          const warnMessage = chalk.yellow(
            `Beginning with the upcoming version,\nbb cli exclusively support environment keys that begin with "BB_<package>"`
          )

          console.log(`\n${warnMessage}\n\n${egString}\n\n${affectedKeys}`)
        }
      }
    )
  }
}
module.exports = HandleAfterStart
