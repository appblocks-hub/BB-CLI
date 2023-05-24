/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const chalk = require('chalk')
const { existsSync } = require('fs')
const { confirmationPrompt, wantToCreateNewVersion, getBlockName } = require('../../../utils/questionPrompts')
const { getAllAppblockVersions } = require('../../publish/util')
// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')

class HandleBeforePull {
  /**
   *
   * @param {PullCore} pullCore
   */
  apply(pullCore) {
    pullCore.hooks.beforePull.tapPromise(
      'HandleBeforePull',
      async (
        /**
         * @type {PullCore}
         */
        core
      ) => {
        const { blockDetails } = core

        core.spinnies.add('at', { text: `Checking appblock versions support` })
        const abVers = await getAllAppblockVersions({ block_version_id: blockDetails.version_id })
        core.spinnies.remove('at')
        const bSab = abVers.data?.map(({ version }) => version) || []
        const pbSab = core.appConfig.config?.supportedAppblockVersions
        if (bSab?.length && pbSab?.length) {
          const isSupported = bSab.some((version) => pbSab.includes(version))
          if (!isSupported) {
            const msg = `${core.appConfig.config.name} supported versions : ${pbSab}\n${blockDetails.block_name} supported versions : ${bSab}`
            console.log(chalk.yellow(msg))
            const goAhead = await confirmationPrompt({
              name: 'goAhead',
              message: `Found non-compatible appblock version in pulling block. Do you want to continue ?`,
              default: false,
            })

            if (!goAhead) throw new Error('Cancelled pulling non-compatible block')
          }
        }

        const { addVariant, variant } = core.cmdOpts

        const { block_visibility: blockVisibility, is_purchased_variant: isPurchasedVariant } = blockDetails

        core.createCustomVariant = false
        if (isPurchasedVariant && blockVisibility !== 5) {
          // FOR NOW: No variant allowed for purchased variant
          core.createCustomVariant = false
        } else if (addVariant === true || (isPurchasedVariant && blockVisibility === 5)) {
          core.createCustomVariant = true
        } else if (variant === false) core.createCustomVariant = false
        else {
          core.createCustomVariant = await wantToCreateNewVersion(blockDetails.block_name)
        }

        if (!core.blockDetails.version_id && core.createCustomVariant) {
          throw new Error(`Variant can't be created under block without version`)
        }

        // check if block exist
        let blockExistMsg = ''
        if (core.appConfig.has(core.blockDetails.block_name)) {
          blockExistMsg = `Block already exists in local`
        } else if (existsSync(core.blockClonePath)) {
          blockExistMsg = `Folder with block name already exists`
        }

        if (blockExistMsg) {
          if (core.createCustomVariant) {
            const goAhead = await confirmationPrompt({
              message: `${blockExistMsg}, Do you want to continue with new name ?`,
              name: 'goAhead',
            })
            if (!goAhead) throw new Error(blockExistMsg)

            core.blockDetails.new_variant_block_name = await getBlockName()
          } else {
            throw new Error(blockExistMsg)
          }
        }
      }
    )
  }
}

module.exports = HandleBeforePull
