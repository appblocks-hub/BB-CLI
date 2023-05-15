/* eslint-disable no-param-reassign */
/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */

// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')
const deployConfigManager = require('../../deploy/manager')
const { checkBlockAssignedToApp, assignBlockToApp } = require('../../../utils/api')
const { post } = require('../../../utils/axios')
const { configstore } = require('../../../configstore')
const { confirmationPrompt } = require('../../../utils/questionPrompts')

class HandleCheckPurchasedPull {
  /**
   *
   * @param {PullCore} pullCore
   */
  apply(pullCore) {
    pullCore.hooks.beforePull.tapPromise(
      'HandleCheckPurchasedPull',
      async (
        /**
         * @type {PullCore}
         */
        core
      ) => {
        const { blockDetails } = core
        if (!blockDetails.is_purchased_variant) return

        // Pulling purchased block code

        await deployConfigManager.init()
        const appData = deployConfigManager.deployAppConfig

        if (!appData?.app_id) {
          throw new Error(`App does not exist to pull\n`)
        }
        
        core.appData = appData

        core.spinnies.add('bp', { text: 'Checking if block is assigned with app' })
        const { error: checkErr, data: checkD } = await post(checkBlockAssignedToApp, {
          block_id: blockDetails.block_id,
          app_id: appData.app_id,
          space_id: configstore.get('currentSpaceId'),
        })
        core.spinnies.remove('bp')
        if (checkErr) throw checkErr

        const checkData = checkD.data || {}

        if (!checkData.exist) {
          if (!checkData.can_assign) {
            throw new Error(`Block is not assigned with ${appData.app_name} \n`)
          }

          const assignAndContinue = await confirmationPrompt({
            name: 'assignAndContinue',
            message: `Block is not assigned. Do you wish to assign ${blockDetails.block_name} block with ${appData.app_name}`,
            default: false,
          })

          if (!assignAndContinue) throw new Error('Paid block should be assigned to an app').message

          core.spinnies.add('bp', { text: 'assigning block with app' })
          const { error: assignErr } = await post(assignBlockToApp, {
            block_id: blockDetails.block_id,
            app_id: appData.app_id,
            space_id: configstore.get('currentSpaceId'),
          })
          core.spinnies.remove('bp')
          if (assignErr) throw assignErr
        }
      }
    )
  }
}

module.exports = HandleCheckPurchasedPull
