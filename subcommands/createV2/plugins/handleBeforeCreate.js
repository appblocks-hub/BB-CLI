/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const chalk = require('chalk')
const { isValidBlockName } = require('../../../utils/blocknameValidator')
const { feedback } = require('../../../utils/cli-feedback')
const getRepoUrl = require('../../../utils/noRepo')
const { getBlockName, getBlockType } = require('../../../utils/questionPrompts')
// eslint-disable-next-line no-unused-vars
const CreateCore = require('../createCore')

class handleBeforeCreate {
  /**
   *
   * @param {CreateCore} createCore
   */
  apply(createCore) {
    createCore.hooks.beforeCreate.tapPromise(
      'handleBeforeCreate',
      async (
        /**
         * @type {CreateCore}
         */
        core
      ) => {
        // eslint-disable-next-line prefer-const
        let { type, autoRepo } = core.cmdOpts
        let { blockName } = core.cmdArgs
        const { logger, packageManager } = core

        const { err, rootManager } = await packageManager.findMyParents()
        if (err) throw err

        const allExistingBlocks = await rootManager.getAllLevelAnyBlock()
        const allExistingBlockNames = allExistingBlocks.map((m) => m.config?.name)
        if (allExistingBlockNames.includes(blockName)) {
          throw new Error('Block name already exist')
        }

        core.logger.info(`Create called with ${blockName} and ${type || 'no type'}`)
        if (!isValidBlockName(blockName)) {
          feedback({
            type: 'warn',
            message: `${blockName} is not a valid name (Only snake case with numbers is valid)`,
          })
          blockName = await getBlockName()
          logger.info(`Changed name to ${blockName}`)
        }

        if (!type) {
          type = await getBlockType(['data', 'job', 'ui-dep-lib'])
          logger.info(`Prompted user for a type and got back ${type}`)
        }

        if (type === 8) {
          const viewBlocks = [...packageManager.uiBlocks]
          const depLibBlocks = viewBlocks.filter(({ meta }) => meta.type === 'ui-dep-lib')[0]
          if (depLibBlocks) {
            console.log(
              `${chalk.bgRed('ERROR')}: One dependency library block already exist with name ${depLibBlocks.meta.name}`
            )
            throw new Error('Cannot create multiple ui-dependency library')
          }
          logger.info(`Dependency library block will be added as block dependencies for all element blocks `)
        }

        // If user is giving a url then no chance of changing this name
        let blockSource
        if (!autoRepo) {
          if (core.repoType !== 'multi') throw new Error('Source can be provided for multi repo pattern only')
          blockSource = await getRepoUrl()
          if (!blockSource.ssh) throw new Error('No git source is provided')
          core.userHasProvidedRepoUrl = true
          core.userProvidedSource = blockSource
        }

        core.cmdArgs.blockName = blockName
        core.cmdOpts.type = type
      }
    )
  }
}
module.exports = handleBeforeCreate
