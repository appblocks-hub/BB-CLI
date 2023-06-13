const treeKill = require('tree-kill')
const isRunning = require('is-running')
const { checkLanguageVersionExistInSystem } = require('../../languageVersion/util')
// eslint-disable-next-line no-unused-vars
const PackageConfigManager = require('../../../utils/configManagers/packageConfigManager')
// eslint-disable-next-line no-unused-vars
const StartCore = require('../startCore')

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
        if (core.cmdOpts.blockType === 'function' && ![...(await core.packageManager.fnBlocks())]?.length) {
          throw new Error(`No function blocks to start!`)
        }

        // check if ui blocks exist when blockType passed as ui
        if (core.cmdOpts.blockType === 'ui' && ![...(await core.packageManager.uiBlocks())]?.length) {
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
        for (const block of await core.packageManager.liveBlocks()) {
          const livePid = block.liveDetails.pid
          if (!livePid) continue
          if (!isRunning(livePid)) continue

          treeKill(livePid, (err) => {
            if (err) {
              core.feedback({
                type: 'muted',
                message: `${block.config.name} was live with pid:${livePid}, couldn't kill it`,
              })
            }
          })
        }
      }
    )
  }
}
module.exports = HandleBeforeStart
