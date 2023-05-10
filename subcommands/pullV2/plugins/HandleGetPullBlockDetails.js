/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */

const path = require('path')
const { existsSync, readFileSync, cp, rm } = require('fs')
const { getBlockPermissionsApi } = require('../../../utils/api')
const { post } = require('../../../utils/axios')
const { confirmationPrompt } = require('../../../utils/questionPrompts')
const { getBlockDetails, getBlockMetaData, getAllBlockVersions } = require('../../../utils/registryUtils')
// eslint-disable-next-line no-unused-vars
const PullCore = require('../pullCore')

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
        const hasBlockId = core.cmdOpts.id
        let pullId = hasBlockId && core.cmdArgs.pullByBlock

        let metaData = {}

        try {
          // eslint-disable-next-line prefer-const
          let [componentName, componentVersion] = core.cmdArgs.pullByBlock?.startsWith('@')
            ? core.cmdArgs.pullByBlock?.replace('@', '')?.split('@') || []
            : core.cmdArgs.pullByBlock?.split('@') || []

          core.pullBlockName = componentName
          core.pullBlockVersion = componentVersion

          if (!core.pullBlockName && !hasBlockId) {
            if (!existsSync(core.appConfig.blockConfigName)) {
              throw new Error('Block name or Block config not found')
            }
            const config = JSON.parse(readFileSync(core.appConfig.blockConfigName))
            if (!config.blockId) throw new Error('Block ID not found in block config')

            core.pullBlockName = config.name

            const goAhead = await confirmationPrompt({
              message: `You are trying to pull ${core.pullBlockName} by config ?`,
              default: false,
              name: 'goAhead',
            })

            if (!goAhead) {
              core.feedback({ type: 'error', message: `Process cancelled` })
              throw new Error('Process cancelled')
            }

            pullId = config.blockId
            metaData.pull_by_config = true
            metaData.block_config = config
            const pullByConfigFolderName = path.basename(path.resolve())
            metaData.pull_by_config_folder_name = pullByConfigFolderName
            core.blockDetails = metaData

            process.chdir('../')
            cp(
              pullByConfigFolderName,
              path.join(core.tempAppblocksFolder, pullByConfigFolderName),
              { recursive: true },
              (err) => {
                if (err) throw err
                rm(pullByConfigFolderName, { recursive: true, force: true }, () => {})
              }
            )
            core.pullBlockVersion = config.version
            core.cwd = path.resolve('.')
            await core.appConfig.init(core.cwd, null, 'pull', { reConfig: true })
          }

          core.logger.info(`pull ${core.pullBlockName} in cwd:${core.cwd}`)
          /**
           * @type {import('../../utils/jsDoc/types').blockDetailsdataFromRegistry}
           */

          /**
           * @type {{status:number,data:{err:string,data:import('../../utils/jsDoc/types').blockDetailsdataFromRegistry,msg:string}}}
           */

          core.spinnies.add('blockExistsCheck', { text: `Searching for ${core.pullBlockName}` })

          // check if pull by id
          if (!hasBlockId) {
            const {
              status,
              data: { err, data: blockDetails },
            } = await getBlockDetails(core.pullBlockName)

            if (status === 204) {
              throw new Error(`${core.pullBlockName} doesn't exists in block repository`)
            }
            if (err) throw new Error(err)

            pullId = blockDetails.id
            metaData = { ...metaData, ...blockDetails }
            core.pullBlockName = metaData.block_name
            core.blockDetails = metaData
          }

          const c = await getBlockMetaData(pullId)

          if (c.data.err) throw new Error(c.data.msg)

          if (c.status === 204) {
            throw new Error(`${core.pullBlockName} doesn't exists in block repository`)
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
              throw new Error(`Please use get command to get free ${componentName}`)
            }
            throw new Error(`Access denied for block ${componentName}`)
          }

          metaData.parent_id = metaData.purchased_parent_block_id || metaData.block_id

          let statusFilter = hasBlockAccess ? undefined : [4]
          let versionOf = metaData.block_id
          if (isPurchasedVariant && blockVisibility === 5) {
            statusFilter = [4] // approved versions
            versionOf = metaData.purchased_parent_block_id
          }
          const bv = await getAllBlockVersions(versionOf, {
            status: statusFilter,
          })

          if (bv.data.err) {
            throw new Error(bv.data.msg)
          }

          if (bv.status === 204 && !hasPullBlockAccess && !hasBlockAccess) {
            throw new Error('No version found for the block to pull')
          }

          const blockVersions = bv.data.data
          const latestVersion = blockVersions?.[0]
          if (!latestVersion) {
            const continueWithLatest = await confirmationPrompt({
              name: 'continueWithLatest',
              message: `Block version not specified. Do you want to pull the latest code?`,
            })

            if (!continueWithLatest) throw new Error('Cancelled Pulling block with latest code')
            return
          }

          if (componentVersion && componentVersion !== 'latest') {
            metaData.version_id = blockVersions.find((v) => v.version_number === componentVersion)?.id
            metaData.version_number = componentVersion
          } else {
            if (componentVersion !== 'latest') {
              const continueWithLatest = await confirmationPrompt({
                name: 'continueWithLatest',
                message: `Block version not specified. Do you want to pull the latest versions ${latestVersion.version_number}?`,
              })
              if (!continueWithLatest) throw new Error('No version specified')
            }

            // get the latest version of parent
            metaData.version_id = latestVersion?.id
            metaData.version_number = latestVersion?.version_number
          }

          if (!metaData.version_id) {
            throw new Error(`${componentVersion} version not found `)
          }

          core.blockDetails = metaData
        } catch (err) {
          if (err.response?.status === 401 || err.response?.status === 403) {
            throw new Error(`Access denied for block ${core.pullBlockName}`)
          }
          throw err
        }
      }
    )
  }
}
module.exports = HandleGetPullBlockDetails
