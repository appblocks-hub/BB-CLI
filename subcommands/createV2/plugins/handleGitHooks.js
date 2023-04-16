/* eslint-disable class-methods-use-this */
const { pExec } = require('../../../utils')
// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handleGitHooks {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.afterCreate.tapPromise(
      'handleGitHooks',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        const { spinnies, logger, blockFolderPath } = core

        if (core.repoType !== 'multi') return

        spinnies.add('lint', { text: 'Installing dependencies' })
        // install only necessary packages for now, to reduce waiting time
        const { err: npmInstallErr } = await pExec('npm i -D husky @commitlint/cli @commitlint/config-conventional', {
          cwd: blockFolderPath,
        })
        if (npmInstallErr) {
          console.log('npm i failed')
          logger.error(npmInstallErr)
        }
        spinnies.update('lint', { text: 'Setting up Husky' })
        logger.info('npm i done')
        const { err } = await pExec('npm run prepare', { cwd: blockFolderPath })
        if (err) {
          console.log('Husky setup failed ')
          logger.error(err)
        }
        spinnies.update('lint', { text: 'Setting up git hooks' })
        if (!err) {
          const { _1 } = await pExec('npx husky add .husky/pre-commit "npm run pre-commit"', { cwd: blockFolderPath })
          if (_1) logger.error('preCommit hook set up failed')
          const { _2 } = await pExec('npx husky add .husky/commit-msg "npx commitlint --edit"', {
            cwd: blockFolderPath,
          })
          if (_2) logger.error('commit-msg hook setup failed')
        }

        await pExec('npm run lint:fix', { cwd: blockFolderPath })
        await pExec('npm run format', { cwd: blockFolderPath })

        spinnies.succeed('lint', { text: 'Git hooks setup successful' })
      }
    )
  }
}
module.exports = handleGitHooks
