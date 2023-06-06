/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
// const path = require('path')
// const { isValidBlockName } = require('../../../utils/blocknameValidator')
// const { feedback } = require('../../../utils/cli-feedback')
// const ConfigFactory = require('../../../utils/configManagers/configFactory')
// const { confirmationPrompt, readInput } = require('../../../utils/questionPrompts')
// const initializePackageBlock = require('../../init/initializePackageBlock')
// eslint-disable-next-line no-unused-vars
const { BB_CONFIG_NAME } = require('../../../utils/constants')
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

        // const { autoRepo } = core.cmdOpts
        // const { blockName } = core.cmdArgs

        // const goAhead = await confirmationPrompt({
        //   message: `You are trying to create a block outside appblock package context. Want to create new package context ?`,
        //   name: 'separateBlockCreate',
        // })

        // if (!goAhead) {
        //   feedback({ type: 'error', message: `Block should be created under package context` })
        //   return
        // }

        // /** **************** */
        // const validate = (input) => {
        //   if (!isValidBlockName(input)) return ` ${input} is not valid name (Only snake case with numbers is valid)`
        //   return true
        // }
        // const packageBlockName = await readInput({
        //   name: 'appName',
        //   message: 'Enter the package name',
        //   validate,
        // })
        // /** **************** */

        // const { DIRPATH: packageDirPath } = await initializePackageBlock(packageBlockName, { autoRepo })

        // // Init for new package dir path
        // // await core.packageManager.init(packageDirPath, null, 'create', { reConfig: true })

        // const configFact = new ConfigFactory()
        // const configPath = path.resolve(packageDirPath, BB_CONFIG_NAME)
        // const { config, err } = await configFact.create(configPath)
        // if (err) throw err

        // core.packageManager = config

        // feedback({ type: 'info', message: `\nContinuing ${blockName} block creation \n` })
      }
    )
  }
}
module.exports = HandleOutOfContext
