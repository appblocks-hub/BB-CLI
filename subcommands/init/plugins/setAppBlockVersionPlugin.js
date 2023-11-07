/* eslint-disable */
const { getAppblockVersionData } = require('../../publish/util')
const InitCore = require('../initCore')

class SetAppBlockVersionPlugin {
  /**
   *
   * @param {InitCore} core
   */
  apply(core) {
    core.hooks.beforeCreateRepo.tapPromise('setAppBlockVersionPlugin', async (context) => {
      const { logger } = context
      logger.info('Inside setAppBlockVersionPlugin')

      const { appblockVersions } = await getAppblockVersionData()
      logger.info(`appblock versions: ${appblockVersions}`)
      core.config.appblockVersions = appblockVersions
    })
  }
}

module.exports = SetAppBlockVersionPlugin
