/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */

const { readInput } = require('../../../utils/questionPrompts')
const { forkRepo } = require('../utils/forkUtil')

// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')

class HandleAddVariant {
  /**
   *
   * @param {PullCore} pullCore
   */
  apply(pullCore) {
    pullCore.hooks.beforePull.tapPromise(
      'HandleAddVariant',
      async (
        /**
         * @type {PullCore}
         */
        core
      ) => {
        const { blockDetails } = core
        if (!core.createCustomVariant || blockDetails.is_purchased_variant) return

        let newVariantType = ['fork', 'clone'].includes(core.variantType?.toLowerCase()) && core.variantType
        if (!core.variantType) {
          newVariantType = await readInput({
            type: 'list',
            name: 'isFork',
            message: 'Choose variant type',
            choices: ['Clone', 'Fork'],
          })
          core.variantType = newVariantType.toLowerCase()
        }

        if (newVariantType !== 'fork') return

        // Fork Repo
        const { sshUrl, blockFinalName } = await forkRepo(blockDetails)
        core.blockDetails.forked_git_url = sshUrl
        core.blockDetails.new_variant_block_name = blockFinalName
        core.blockDetails.forked_block_name = blockFinalName
      }
    )
  }
}

module.exports = HandleAddVariant
