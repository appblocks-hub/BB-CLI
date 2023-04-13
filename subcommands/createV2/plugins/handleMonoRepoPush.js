/* eslint-disable class-methods-use-this */

// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')
// const { configstore } = require('../../../configstore')
// const { GitManager } = require('../../../utils/gitmanager')

class handleOrphanBranch {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.afterCreate.tapPromise(
      'handleOrphanBranch',
      async (
        /**
         * @type {CreateCore}
         */
        // core
      ) => {
        // if (core.repoType !== 'mono') return
        // const { source } = core.appConfig.config || {}

        // const prefersSsh = configstore.get('prefersSsh')
        // const originUrl = prefersSsh ? source.ssh : source.https
       
        // const Git = new GitManager(core.cwd, 'notImp', originUrl, prefersSsh)
        // await Git.newBranch('main')
        // await Git.stageAll()
        // await Git.commit('chore: initial commit')
        // // await Git.push('main')
        // await Git.setUpstreamAndPush('main')

        // const { spinnies, logger, blockFolderPath } = core
      }
    )
  }
}
module.exports = handleOrphanBranch
