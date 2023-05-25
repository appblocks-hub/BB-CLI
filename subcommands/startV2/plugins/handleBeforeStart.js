const treeKill = require('tree-kill')
const isRunning = require('is-running')
const { checkLanguageVersionExistInSystem } = require('../../languageVersion/util')
const { getNodePackageInstaller } = require('../../../utils/nodePackageManager')
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
        core,
        /**
         * @type {PackageConfigManager}
         */
        packageConfigManager
      ) => {
        global.rootDir = this.cwd
        getNodePackageInstaller()

        const { blockName } = core.cmdArgs
        // If name exist check with config and dependencies
        if (blockName && packageConfigManager.has(blockName)) {
          throw new Error(`Block ${blockName} not found in package ${core.packageConfig.name}`)
        }

        // If no block name is given, all blocks has to be started.
        // Make sure there are one or more blocks present

        if ([...(await packageConfigManager.allBlockNames())].length <= 0) {
          throw new Error(`No blocks to start!`)
        }

        // TODO: add a --restart flag. and do a check here. if cmdArgs.restart===false
        if ([...(await packageConfigManager.nonLiveBlocks())].length === 0) {
          throw new Error(`All blocks are already live!`)
        }

        // check if function or job exist when blockType passed as function
        if (core.cmdOpts.blockType === 'function' && ![...(await packageConfigManager.jobBlocks())]?.length) {
          throw new Error(`No function blocks to start!`)
        }

        // check if ui blocks exist when blockType passed as ui
        if (core.cmdOpts.blockType === 'ui' && ![...(await packageConfigManager.uiBlocks())]?.length) {
          throw new Error(`No ui blocks to start!`)
        }

        // Check if block runtime languages are in system
        const blockLanguages = blockName
          ? [await packageConfigManager.getBlock(blockName).config?.language]
          : [...new Set([...(await packageConfigManager.getAllBlockLanguages())])]
        const supportedAppblockVersions = packageConfigManager.config?.supportedAppblockVersions
        await checkLanguageVersionExistInSystem({ supportedAppblockVersions, blockLanguages })

        /**
         * If some blocks are already running, kill them before
         * starting them again to avoid not killed processes
         */
        for (const block of await packageConfigManager.liveBlocks()) {
          if (!isRunning(block?.pid)) continue
          treeKill(block.pid, (err) => {
            if (err) {
              core.feedback({
                type: 'muted',
                message: `${block.config.name} was live with pid:${block.pid}, couldn't kill it`,
              })
            }
          })
        }
      }
    )
  }
}
module.exports = HandleBeforeStart
