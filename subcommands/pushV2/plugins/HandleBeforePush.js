/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */

const chalk = require('chalk')
const { getCommitMessage, getGitConfigNameEmail } = require('../../../utils/questionPrompts')
// eslint-disable-next-line no-unused-vars
const PushCore = require('../pushCore')

class HandleBeforePush {
  async getAllBlocksToPush(manger, blocks) {
    for await (const blockManager of manger.getDependencies()) {
      if (!blockManager?.config) continue
      const { type } = blockManager.config
      blocks.push(manger)
      if (type === 'package') {
        await this.getAllBlocksToPush(blockManager, blocks)
      }
    }
    return blocks
  }

  /**
   *
   * @param {PushCore} pushCore
   */
  apply(pushCore) {
    pushCore.hooks.beforePush.tapPromise(
      'HandleBeforePush',
      async (
        /**
         * @type {PushCore}
         */
        core
      ) => {
        const { blockName } = core.cmdArgs

        // eslint-disable-next-line prefer-const
        let { message, force } = core.cmdOpts

        if (!force && !blockName) {
          throw new Error(`Please provide a block name or use -f to push all..`)
        }

        if (!message) message = await getCommitMessage()

        console.log('Please enter git username and email')
        console.log(
          chalk.dim.italic(
            `If i can't find name and email in global git config,\nI'll use these values on making commits..`
          )
        )

        let gitUserEmail
        let gitUserName

        if (global.HEADLESS_CONFIGS) {
          gitUserEmail = global.HEADLESS_CONFIGS.gitUserEmail
          gitUserName = global.HEADLESS_CONFIGS.gitUserName
        }

        if (!gitUserEmail || gitUserName) {
          const { gitUserName: gn, gitUserEmail: ge } = await getGitConfigNameEmail()
          gitUserName = gn
          gitUserEmail = ge
        }

        let blocksToPush = []

        if (blockName) {
          // If name exist check with config and dependencies
          if (!core.packageManager.has(blockName)) {
            throw new Error(`Block ${blockName} not found in package ${core.packageConfig.name}`)
          }
          blocksToPush = [await core.packageManager.getBlock(blockName)]
        } else {
          blocksToPush = await this.getAllBlocksToPush(core.packageManager, [])
        }

        const nonSourceBlock = []
        blocksToPush = blocksToPush.filter((block) => {
          if (block.config.source && Object.keys(block.config.source).length) return true
          nonSourceBlock.push(blockName)
          return false
        })

        if (nonSourceBlock.length) {
          console.log(chalk.yellow(`No git source found for ${nonSourceBlock}.`))
        }

        core.blocksToPush = blocksToPush
        core.gitUserName = gitUserName
        core.gitUserEmail = gitUserEmail
        core.cmdOpts.message = message
      }
    )
  }
}
module.exports = HandleBeforePush
