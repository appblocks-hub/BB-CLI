const { checkLanguageVersionExistInSystem } = require('../../../utils/languageVersion')
// eslint-disable-next-line no-unused-vars
const StartCore = require('../startCore')
const { treeKillSync } = require('../../../utils')

class HandleBeforeStart {
  // eslint-disable-next-line class-methods-use-this
  apply(startCore) {
    startCore.hooks.beforeStart.tapPromise(
      'HandleBeforeStart',
      async (
        /**
         * @type {StartCore}
         */
        core
      ) => {
        global.rootDir = this.cwd

        const { blockName } = core.cmdArgs
        const { blockType } = core.cmdOpts

        // If name exist check with config and dependencies
        if (blockType && !['ui', 'function'].some((t) => t === blockType)) {
          throw new Error(`Block type (--block-type) passed should be "ui" or "function"`)
        }

        // If name exist check with config and dependencies
        if (blockName && !(await core.packageManager.has(blockName))) {
          throw new Error(`Block ${blockName} not found in package ${core.packageConfig.name}`)
        }

        // If no block name is given, all blocks has to be started.
        // Make sure there are one or more blocks present

        if ([...(await core.packageManager.allBlockNames())].length <= 0) {
          throw new Error(`No blocks to start!`)
        }

        // TODO: add a --restart flag. and do a check here. if cmdArgs.restart===false
        if ([...(await core.packageManager.nonLiveBlocks())].length === 0) {
          throw new Error(`All blocks are already live!`)
        }

        // check if function or job exist when blockType passed as function
        if (blockType === 'function' && ![...(await core.packageManager.fnBlocks())]?.length) {
          throw new Error(`No function blocks to start!`)
        }

        // check if ui blocks exist when blockType passed as ui
        if (blockType === 'ui' && ![...(await core.packageManager.uiBlocks())]?.length) {
          throw new Error(`No ui blocks to start!`)
        }

        // Check if block runtime languages are in system
        const blockLanguages = blockName
          ? [await core.packageManager.getBlock(blockName).config?.language]
          : [...new Set([...(await core.packageManager.getAllBlockLanguages())])]
        const supportedAppblockVersions = core.packageManager.config?.supportedAppblockVersions

        await checkLanguageVersionExistInSystem({ supportedAppblockVersions, blockLanguages })

        /**
         * If some blocks are already running, kill them before
         * starting them again to avoid not killed processes
         */

        const liveBlocks = await core.packageManager.liveBlocks()
        for (const block of liveBlocks) {
          const livePid = block.liveDetails.pid

          if (blockName && block.config.name !== blockName) continue
          if (blockType && block.config.type !== blockType) continue

          try {
            await treeKillSync(livePid)
          } catch (error) {
            core.feedback({
              type: 'muted',
              message: `${block.config.name} was live with pid:${livePid}, couldn't kill it`,
            })
          }
        }
      }
    )
  }
}
module.exports = HandleBeforeStart
