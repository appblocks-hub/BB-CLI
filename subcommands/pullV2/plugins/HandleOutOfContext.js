/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */

const { blockTypeInverter } = require('../../../utils/blockTypeInverter')
// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')

class HandleOutOfContext {
  /**
   *
   * @param {PullCore} pullCore
   */
  apply(pullCore) {
    pullCore.hooks.beforePull.tapPromise(
      'HandleOutOfContext',
      async (
        /**
         * @type {PullCore}
         */
        core
      ) => {
        if (!core.isOutOfContext) return

        const blockType = blockTypeInverter(core.blockDetails.block_type)
        if (blockType !== 'package' && blockType !== 'raw-package') {
          throw new Error(
            `You are trying to pull a ${blockType} block outside package context.\nPlease create a package or pull into an existing package context`
          )
        }
      }
    )
  }
}
module.exports = HandleOutOfContext
