/* eslint-disable no-param-reassign */

const { checkAndSetGitConfigNameEmail } = require('../../../utils/gitCheckUtils')
const GitConfigFactory = require('../../../utils/gitManagers/gitConfigFactory')
const { headLessConfigStore, configstore } = require('../../../configstore')
const { updateAllMemberConfig } = require('../utils')

/* eslint-disable class-methods-use-this */
class HandleAfterConnectRemote {
  /**
   *
   * @param {ConnectRemoteCore} core
   */
  apply(connectRemoteCore) {
    connectRemoteCore.hooks.afterConnectRemote.tapPromise('HandleAfterConnectRemote', async (core) => {
      const { manager, source } = core

      const { manager: Git, error } = await GitConfigFactory.init({ cwd: manager.directory, gitUrl: source.ssh })
      if (error) throw error

      await checkAndSetGitConfigNameEmail(manager.directory)
      core.spinnies.add('cr', { text: 'Adding source to blocks' })
      let { prefersSsh } = headLessConfigStore().store
      if (prefersSsh == null) prefersSsh = configstore.get('prefersSsh')

      await Git.stageAll()
      await Git.commit('feat: Initial commit')
      await Git.renameBranch('main')
      await Git.addRemote('origin', prefersSsh ? source.ssh : source.https)

      if (manager.config.repoType === 'multi') {
        manager.updateConfig({ source })
        core.spinnies.succeed('cr', { text: 'Successfully added source to block' })
        return
      }

      manager.updateConfig({ source })
      if (manager.config.type === 'package') await updateAllMemberConfig(manager, source)
    })
  }
}

module.exports = HandleAfterConnectRemote
