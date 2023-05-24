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

        let { message, force } = core.cmdOpts

        if (core.appConfig.isInBlockContext && !core.appConfig.isInAppblockContext) {
          // There will only be one block in temp config which is the enclosing block
          force = true
        }

        if (!force && !blockName) {
          throw new Error(`Please provide a block name or use -f to push all..`)
        }

        if (!message) {
          message = await getCommitMessage()
        }

        console.log('Please enter git username and email')
        console.log(
          chalk.dim.italic(
            `If i can't find name and email in global git config,\nI'll use these values on making commits..`
          )
        )

        // TODO-- store these values in config and don't ask every time, can be used in pull as well
        const { gitUserName, gitUserEmail } = await getGitConfigNameEmail()

        let blocksToPush = force ? [...core.appConfig.dependencies] : [core.appConfig.getBlock(blockName)]

        const nonSourceBlock = []
        blocksToPush = blocksToPush.filter((block) => {
          if (Object.keys(block.meta.source || {}).length) return true
          nonSourceBlock.push(blockName)
          return false
        })

        if (nonSourceBlock.length) {
          console.log(chalk.yellow(`No git source found for ${nonSourceBlock}.`))
        }

        core.blocksToPush = blocksToPush
        core.gitUserName = gitUserName
        core.gitUserEmail = gitUserEmail
      }
    )
  }
}
module.exports = HandleBeforePush
