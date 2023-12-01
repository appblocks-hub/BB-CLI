/* eslint-disable no-param-reassign */

const path = require('path')
const { existsSync } = require('fs')
const {  writeFile } = require('fs/promises')
const { isInGitRepository, tryGitInit } = require('../../../utils/gitCheckUtils')
const { generateGitIgnore } = require('../../../templates/createTemplates/function-templates')

/* eslint-disable class-methods-use-this */
class HandleBeforeConnectRemote {
  /**
   *
   * @param {ConnectRemoteCore} core
   */
  apply(connectRemoteCore) {
    connectRemoteCore.hooks.beforeConnectRemote.tapPromise('HandleBeforeConnectRemote', async (core) => {
      const { manager } = core
      core.spinnies.add('cr', { text: 'Initializing Config' })
      const { err } = await manager.findMyParentPackage()
      core.spinnies.remove('cr')

      if (!err && manager.config.repoType === 'mono') {
        throw new Error('Please run this command from root package context')
      }

      const sourceExist = manager.config.source.https && manager.config.source.ssh
      if (sourceExist) throw new Error('Source already exist')

      // TODO: if there is an option to update existing source, warn and continue
      // if (sourceExist && !cmdOptions.force) {
      //   const goAhead = await confirmationPrompt({
      //     message: `Source already exist. Do you want to replace with new source ?`,
      //     name: 'goAhead',
      //   })

      //   if (!goAhead) throw new Error('Source already exist')
      // }

      // check if already git initialized else init
      if (!isInGitRepository()) tryGitInit()

      // check if gitignore exist else add
      const gitIgnorePath = path.join(manager.directory, '.gitignore')
      if (!existsSync(gitIgnorePath)) {
        const gitIgnoreString = generateGitIgnore()
        writeFile(gitIgnorePath, gitIgnoreString)
      }
    })
  }
}

module.exports = HandleBeforeConnectRemote
