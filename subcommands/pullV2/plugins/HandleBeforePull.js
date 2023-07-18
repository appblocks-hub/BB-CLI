/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const chalk = require('chalk')
const path = require('path')
const { existsSync } = require('fs')
const { confirmationPrompt, wantToCreateNewVersion, getBlockName } = require('../../../utils/questionPrompts')
const { getAllAppblockVersions } = require('../../publish/util')
// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')
const { headLessConfigStore, configstore } = require('../../../configstore')

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
        const { blockDetails, cmdOpts, cmdArgs } = core
        const { force } = cmdOpts
        const { pullBlockNewName } = cmdArgs

        core.spinnies.add('at', { text: `Checking appblock versions support` })
        const abVers = await getAllAppblockVersions({ block_version_id: blockDetails.version_id })
        core.spinnies.remove('at')
        const bSab = abVers.data?.map(({ version }) => version) || []
        const pbSab = core.packageConfig.supportedAppblockVersions
        if (bSab?.length && pbSab?.length) {
          const isSupported = bSab.some((version) => pbSab.includes(version))
          const msg = `${core.packageConfig.name} supported versions : ${pbSab}\n${blockDetails.block_name} supported versions : ${bSab}`
          if (!isSupported && !force) {
            console.log(chalk.yellow(msg))
            const goAhead = await confirmationPrompt({
              name: 'goAhead',
              message: `Found non-compatible appblock version in pulling block. Do you want to continue ?`,
              default: false,
            })

            if (!goAhead) throw new Error('Cancelled pulling non-compatible block')
          }
        }

        // default value of variant will be true
        const { variant } = core.cmdOpts
        const { block_visibility: blockVisibility, is_purchased_variant: isPurchasedVariant } = blockDetails
        core.createCustomVariant = variant ?? false

        const currentSpaceId =
          headLessConfigStore(null, true).get('currentSpaceId', '') || configstore.get('currentSpaceId', '')

        if (isPurchasedVariant) {
          // set variant true if block is temp block
          core.createCustomVariant = blockVisibility === 5
        } else if (!core.isOutOfContext) {
          core.createCustomVariant = true
        } else if (currentSpaceId !== core.blockDetails.space_id) {
          core.createCustomVariant = true
        } else if (!force && variant == null) {
          core.createCustomVariant = await wantToCreateNewVersion(blockDetails.block_name)
        }

        if (!core.blockDetails.version_id && core.createCustomVariant) {
          if (isPurchasedVariant) throw new Error(`Variant can't be created under block without version`)
          console.log(
            chalk.yellow(
              `No version found, new block will not be considered as variant of ${core.blockDetails.block_name}`
            )
          )
        }

        const checkBlockName = (core.createCustomVariant && pullBlockNewName) || core.blockDetails.block_name
        core.blockDetails.new_variant_block_name = core.createCustomVariant && pullBlockNewName
        const clonePath = path.join(core.cwd, checkBlockName)
        core.blockClonePath = clonePath
        core.pullBlockName = checkBlockName

        // repoType !== 'mono'

        // check if block exist
        let blockExistMsg = ''
        if (core.packageManager?.has(checkBlockName)) {
          blockExistMsg = `Block ${checkBlockName} already exists in local`
        } else if (existsSync(clonePath)) {
          blockExistMsg = `Folder ${checkBlockName} already exists`
        }

        if (!blockExistMsg) return

        if (core.createCustomVariant) {
          if (!force) {
            const goAhead = await confirmationPrompt({
              message: `${blockExistMsg}! Do you want to continue with new name ?`,
              name: 'goAhead',
            })
            if (!goAhead) throw new Error(blockExistMsg)
          }

          core.blockDetails.new_variant_block_name = await getBlockName()
          core.blockClonePath = path.join(core.cwd, core.blockDetails.new_variant_block_name)
        } else {
          console.log(chalk.dim(`Create as custom variant to pull with different name`))
          throw new Error(blockExistMsg)
        }
      }
    )
  }
}

module.exports = HandleBeforePull
