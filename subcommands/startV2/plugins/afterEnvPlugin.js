/* eslint-disable no-unused-vars */
const isRunning = require('is-running')
const treeKill = require('tree-kill')
const { AppblockConfigManager } = require('../../../utils/appconfig-manager')
const { feedback } = require('../../../utils/cli-feedback')
const StartCore = require('../startCore')

class XYZ {
  // eslint-disable-next-line class-methods-use-this
  apply(startCore) {
    startCore.hooks.afterEnv.tapPromise(
      'XYZ',
      async (
        /**
         * @type {StartCore}
         */
        core,
        /**
         * @type {AppblockConfigManager}
         */
        config
        // eslint-disable-next-line consistent-return
      ) => {
        if (core.cmdArgs.blockname && !config.has(core.cmdArgs.blockname)) {
          return 'Block not found'
        }

        // If no block name is given, all blocks has to be started.
        // Make sure there are one or more blocks present

        if ([...config.allBlockNames].length <= 0) {
          return `No blocks to start!`
        }

        // TODO: add a --restart flag. and do a check here. if cmdArgs.restart===false
        if ([...config.nonLiveBlocks].length === 0) {
          return `All blocks are already live!`
        }

        /**
         * If some blocks are already running, kill them before
         * starting them again to avoid unkilled processes
         */
        for (const block of config.liveBlocks) {
          if (isRunning(block?.pid)) {
            treeKill(block.pid, (err) => {
              if (err) {
                feedback({
                  type: 'muted',
                  message: `${block.meta.name} was live with pid:${block.pid}, couldn't kill it`,
                })
              }
            })
          }
        }
      }
    )
  }
}

module.exports = XYZ
