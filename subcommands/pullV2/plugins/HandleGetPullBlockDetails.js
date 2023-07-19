/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */

const { getBlockPermissionsApi } = require('../../../utils/api')
const { post } = require('../../../utils/axios')
const { blockTypeInverter } = require('../../../utils/blockTypeInverter')
const { confirmationPrompt } = require('../../../utils/questionPrompts')
const { getBlockMetaData, getAllBlockVersions, getBlockDetailsV2 } = require('../../../utils/registryUtils')
// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')
const { getBlockPullKeys } = require('../utils')

class HandleGetPullBlockDetails {
  /**
   *
   * @param {PullCore} pullCore
   */
  apply(pullCore) {
    pullCore.hooks.beforePull.tapPromise(
      'HandleGetPullBlockDetails',
      async (
        /**
         * @type {PullCore}
         */
        core
      ) => {
        const { pullBlock } = core.cmdArgs
        const { id: hasBlockId, force } = core.cmdOpts
        let pullId = hasBlockId && pullBlock

        let metaData = {}

        try {
          core.blockPullKeys = getBlockPullKeys(pullBlock)
          core.pullBlockName = core.blockPullKeys.blockName

          if (!core.blockPullKeys.rootPackageName) {
            core.blockPullKeys.rootPackageName = core.pullBlockName
          }

          // TODO pull by config
          // if (!core.pullBlockName && !hasBlockId) {
          //   const res =  await pullByConfigSetup(core, metaData)
          //   if (res.pullId) pullId = res.pullId
          //   if (res.metaData) metaData = res.metaData
          // }

          core.spinnies.add('blockExistsCheck', { text: `Searching for ${core.pullBlockName}` })

          // check if pull by id
          if (!hasBlockId) {
            const {
              status,
              data: { err, data: blockDetails },
            } = await getBlockDetailsV2(core.blockPullKeys)

            if (status === 204) {
              throw new Error(`${core.pullBlockName} doesn't exists in block repository under given space`)
            }
            if (err) throw new Error(err)

            pullId = blockDetails.id
            metaData = { ...metaData, ...blockDetails }
            core.pullBlockName = metaData.block_name
            core.blockDetails = metaData
          }

          const c = await getBlockMetaData(pullId, core.blockPullKeys.spaceName)

          if (c.data.err) throw new Error(c.data.msg)

          if (c.status === 204) {
            throw new Error(`${core.pullBlockName} doesn't exists in block repository under given space`)
          }

          core.spinnies.succeed('blockExistsCheck', { text: `${core.pullBlockName} is available` })
          core.spinnies.remove('blockExistsCheck')

          const blockMeta = c.data?.data
          metaData = { ...metaData, ...blockMeta, id: blockMeta.block_id }
          metaData.parent_id = metaData.purchased_parent_block_id || metaData.block_id

          core.pullBlockVersion = null
          core.blockDetails = metaData

          core.spinnies.add('pab', { text: 'checking block permission ' })
          const { data: pData, error: pErr } = await post(getBlockPermissionsApi, {
            block_id: metaData.block_id,
            space_name: core.blockPullKeys.spaceName,
          })
          core.spinnies.remove('pab')
          if (pErr) throw pErr

          delete pData.data?.id

          metaData = { ...metaData, ...pData.data }

          const {
            has_access: hasBlockAccess,
            has_pull_access: hasPullBlockAccess,
            block_visibility: blockVisibility,
            is_purchased_variant: isPurchasedVariant,
          } = metaData

          if (!hasBlockAccess && !hasPullBlockAccess) {
            if (blockVisibility === 4) {
              throw new Error(`Please use get command to get free ${core.blockPullKeys.blockName}`)
            }
            throw new Error(`Access denied for block ${core.blockPullKeys.blockName}`)
          }

          metaData.parent_id = metaData.purchased_parent_block_id || metaData.block_id

          const blockType = blockTypeInverter(core.blockDetails.block_type)
          if (core.isOutOfContext && blockType !== 'package') {
            throw new Error(
              `You are trying to pull a ${blockType} block outside package context.\n Please create a package or pull into an existing package context`
            )
          }

          let statusFilter = hasBlockAccess ? undefined : [4]
          let versionOf = metaData.block_id
          if (isPurchasedVariant && blockVisibility === 5) {
            statusFilter = [4] // approved versions
            versionOf = metaData.purchased_parent_block_id
          }
          const bv = await getAllBlockVersions(versionOf, {
            status: statusFilter,
            space_name: core.blockPullKeys.spaceName,
          })

          if (bv.data.err) {
            throw new Error(bv.data.msg)
          }

          if (bv.status === 204 && !hasPullBlockAccess && !hasBlockAccess) {
            throw new Error('No version found for the block to pull')
          }

          core.blockDetails = metaData

          const blockVersions = bv.data.data
          const latestVersion = blockVersions?.[0]
          const bVersionToPull = core.blockPullKeys.blockVersion
          if (bVersionToPull && bVersionToPull !== 'latest') {
            metaData.version_id = blockVersions?.find((v) => v.version_number === bVersionToPull)?.id
            metaData.version_number = bVersionToPull
          } else if (bVersionToPull !== 'latest') {
            metaData.version_id = latestVersion?.id
            metaData.version_number = latestVersion?.version_number
          }

          core.blockDetails = metaData

          if (metaData.version_id) return

          if (force) {
            if (bVersionToPull) throw new Error(`Block version ${bVersionToPull} not found`)
            console.log('Pull the latest code')
            return
          }

          let msg = `Block version not specified!`
          if (bVersionToPull) msg = `Block version ${bVersionToPull} not found!`

          const continueWithLatest = await confirmationPrompt({
            name: 'continueWithLatest',
            message: `${msg} Do you want to pull the latest code?`,
          })

          if (!continueWithLatest) throw new Error('Cancelled Pulling block without version')
        } catch (err) {
          if (err.response?.status === 401 || err.response?.status === 403) {
            const eMsg = err.response.data.msg || `Access denied for block`
            throw new Error(`${eMsg} ${core.pullBlockName}`)
          }
          throw err
        }
      }
    )
  }
}
module.exports = HandleGetPullBlockDetails
