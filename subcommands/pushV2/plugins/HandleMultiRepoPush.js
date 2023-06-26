/* eslint-disable no-param-reassign */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */

// eslint-disable-next-line no-unused-vars
const PushCore = require('../pushCore')

class HandleMultiRepoPush {
  /**
   *
   * @param {PushCore} pushCore
   */
  apply(pushCore) {
    pushCore.hooks.beforePush.tapPromise(
      'HandleMultiRepoPush',
      async (
        /**
         * @type {PushCore}
         */
        core
      ) => {
        if (core.packageConfig?.repoType !== 'multi') return

        const { blockName } = core.cmdArgs
        const { all } = core.cmdOpts
        
        if (!all || blockName) return

        const memberBlocks = await core.packageManager.getAllLevelAnyBlock()
        core.packageManager.gitAddIgnore = `-- ${memberBlocks.map(({ directory }) => `':!${directory}'`).join(' ')}`

        core.blocksToPush = [...core.blocksToPush, core.packageManager]
      }
    )
  }
}
module.exports = HandleMultiRepoPush
