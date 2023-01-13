/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const chalk = require('chalk')
const { mkdirSync, existsSync, rm } = require('fs')

const { spinnies } = require('../../loader')
const { getBlockPersmissionsApi, trackBlockUpdatePull, listUnpulledBlockBersions } = require('../../utils/api')
const { getBlockMetaData, getAllBlockVersions } = require('../../utils/registryUtils')
const { post } = require('../../utils/axios')
const { feedback } = require('../../utils/cli-feedback')
const { pullSourceCodeFromAppblock } = require('../pull/sourceCodeUtil')
const { configstore } = require('../../configstore')
const { checkIsBlockAppAssinged } = require('../pull/purchasedPull')
const { readInput } = require('../../utils/questionPrompts')

const pullBlockUpdate = async (options) => {
  let blockFolderPath
  try {
    const { blockDetails, cwd, appConfig } = options
    // get the version id of the latest verion of parent
    spinnies.add('pbu', { text: 'Getting block meta data ' })
    const c = await getBlockMetaData(blockDetails.ID)
    spinnies.remove('pbu')
    if (c.data.err) throw new Error(c.data.msg)

    const bmd = c.data.data

    spinnies.add('pbu', { text: 'Checking block permission ' })
    const { data: pData, error: pErr } = await post(getBlockPersmissionsApi, {
      block_id: blockDetails.ID,
    })
    spinnies.remove('pbu')
    if (pErr) throw pErr
    const bpd = pData.data

    const blockMetatData = { ...bmd, ...blockDetails, ...bpd }

    const {
      has_pull_access: hasPullBlockAccess,
      block_visibility: blockVisiblity,
      is_purchased_variant: isPurcahsedVariant,
    } = blockMetatData

    if (!hasPullBlockAccess && blockVisiblity !== 4) {
      feedback({ type: 'info', message: `Pull access denied for block ${blockMetatData.BlockName}` })
      return
    }

    let pullUpdateBlockId = blockMetatData.ID
    let appData
    let pullableBlockVersions = []

    if (isPurcahsedVariant) {
      // purchased block
      pullUpdateBlockId = blockMetatData.purchased_parent_block_id

      spinnies.add('pbu', { text: 'Getting parent block meta data ' })
      const parentBlockRes = await getBlockMetaData(blockMetatData.purchased_parent_block_id)
      spinnies.remove('pbu')
      if (parentBlockRes.data.err) throw new Error(parentBlockRes.data.msg)
      const pbmd = parentBlockRes.data.data

      blockMetatData.parentBlockName = pbmd.block_name

      const checkData = await checkIsBlockAppAssinged({ metaData: blockMetatData })
      if (!checkData.exist) {
        throw new Error(chalk.red(`Block is not assigned with ${checkData.app_name} \n`))
      }
      appData = checkData.appData

      spinnies.add('pbu', { text: 'Getting latest block version ' })
      const { data, error: luErr } = await post(listUnpulledBlockBersions, {
        app_id: appData.app_id,
        block_id: pullUpdateBlockId,
      })
      spinnies.remove('pbu')

      if (luErr) throw luErr

      pullableBlockVersions = data.data

      if (!pullableBlockVersions?.length) {
        throw new Error('No latest version found for the block to pull')
      }
    } else {
      // free block
      const appBlockConfigData = appConfig.appConfig
      const blockConfigData = appBlockConfigData.dependencies[blockDetails.BlockName]

      spinnies.add('pbu', { text: 'Getting block version ' })
      const versionOf = blockConfigData.parent ? blockConfigData.parent.block_id : blockDetails.ID
      const bv = await getAllBlockVersions(versionOf, { status: [4] })
      spinnies.remove('pbu')

      if (bv.data.err) throw new Error(bv.data.msg)

      if (bv.status === 204) {
        throw new Error('No version found for the block to pull')
      }

      pullableBlockVersions = bv.data.data

      if (!pullableBlockVersions?.length) {
        throw new Error('No version found for the block to pull')
      }
    }

    const pullVersion = await readInput({
      type: 'list',
      name: 'pullVersion',
      message: 'Select a version to update',
      validate: (input) => {
        if (!input) return `Please select a version`
        return true
      },
      choices: pullableBlockVersions.map((d) => {
        const data = {
          version_number: isPurcahsedVariant ? d.block_version_number : d.version_number,
          id: isPurcahsedVariant ? d.block_version_id : d.id,
        }
        return { name: data.version_number, value: data }
      }),
    })
    blockMetatData.version_id = pullVersion?.id
    blockMetatData.version_number = pullVersion?.version_number

    if (!blockMetatData.version_id) {
      throw new Error('Error getting version data')
    }

    const pulledFolderName = isPurcahsedVariant
      ? `${blockMetatData.parentBlockName}@${blockMetatData.version_number}`
      : `${blockMetatData.BlockName}@${blockMetatData.version_number}`
    const blockUpdatesFolder = '_block_updates'

    blockFolderPath = path.resolve(cwd, blockUpdatesFolder, pulledFolderName)

    if (!existsSync(blockFolderPath)) mkdirSync(blockFolderPath, { recursive: true })

    const pullOptions = { blockFolderPath, metaData: blockMetatData, blockId: blockMetatData.ID }

    if (isPurcahsedVariant) {
      pullOptions.blockId = blockMetatData.purchased_parent_block_id
      pullOptions.variantBlockId = blockMetatData.ID
      pullOptions.appId = appData.app_id
      pullOptions.spaceId = configstore.get('currentSpaceId')
    }

    spinnies.add('pbu', { text: `Pulling block source code for version ${blockMetatData.version_number}` })
    await pullSourceCodeFromAppblock(pullOptions)
    spinnies.succeed('pbu', {
      text: `Block update pulled successfully to ${blockUpdatesFolder}/${pulledFolderName} folder`,
    })

    if (isPurcahsedVariant) {
      // update
      const { error } = await post(trackBlockUpdatePull, {
        block_id: blockMetatData.purchased_parent_block_id,
        block_version_id: blockMetatData.version_id,
        app_id: pullOptions.appId,
      })

      if (error) throw error
    }
  } catch (error) {
    spinnies.add('pbu')
    spinnies.fail('pbu', { text: error.response?.data?.msg || error.message || `Error pulling block update` })
    spinnies.remove('pbu')

    if (existsSync(blockFolderPath)) rm(blockFolderPath, { recursive: true })
  }
}

module.exports = { pullBlockUpdate }
