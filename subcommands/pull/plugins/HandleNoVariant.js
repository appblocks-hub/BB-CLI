/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */

// const { confirmationPrompt } = require('../../../utils/questionPrompts')

// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')

class HandleNoVariant {
  /**
   *
   * @param {PullCore} pullCore
   */
  apply(pullCore) {
    pullCore.hooks.beforePull.tapPromise(
      'HandleNoVariant',
      async (
        /**
         * @type {PullCore}
         */
        core
      ) => {
        if (core.createCustomVariant) return

        // TODO pull by config
        // const { blockDetails } = core
        // if (blockDetails.pull_by_config && core.pullByConfigFolderName !== blockDetails.block_name) {
        //   const goAhead = await confirmationPrompt({
        //     name: 'goAhead',
        //     message: `Block name and folder name should be same. Do you want to rename ${core.pullByConfigFolderName} to ${blockDetails.block_name} ?`,
        //   })
        //   if (!goAhead) throw new Error('Cannot proceed with different name')
        // }

        const existingBlock = core.packageManager?.getAnyBlock(core.pullBlockName)

        if (existingBlock) {
          throw new Error(`${core.pullBlockName} already exists at ${existingBlock.directory}`)
        }
      }
    )
  }
}

module.exports = HandleNoVariant
