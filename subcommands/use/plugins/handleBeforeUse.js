/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const chalk = require('chalk')
const { listSpaces } = require('../../../utils/spacesUtils')

class HandleBeforeUse {
  /**
   *
   * @param {UseCore} core
   */
  apply(useCore) {
    useCore.hooks.beforeUse.tapPromise('HandleBeforeUse', async (core) => {
      const { cmdArgs } = core
      const [spaceName] = cmdArgs || []

      if (spaceName && core.currentSpaceName === spaceName) {
        throw new Error(`${spaceName} is already set`)
      }

      if (core.currentSpaceName) {
        console.log(chalk.dim(`current space is ${core.currentSpaceName}`))
      }

      core.spinnies.add('spaces', { text: 'Reading all spaces' })
      const res = await listSpaces()
      core.spinnies.remove('spaces')
      if (res.data.err) {
        throw new Error(res.data.msg)
      }

      core.spaceData = res.data?.data
    })
  }
}

module.exports = HandleBeforeUse
