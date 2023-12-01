/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { readInput } = require('../../utils/questionPrompts')
const { spinnies } = require('../../loader')
const { getAllAppblockVersions } = require('../publish/utils')
// const { getAllBlockVersions } = require('../../utils/registryUtils')
// const { post } = require('../../utils/axios')
// const { linkAbVersionBlockVersion } = require('../../utils/api')
const { checkIsAllBlockSupportDependencies } = require('./util')
const { BB_CONFIG_NAME } = require('../../utils/constants')
const ConfigFactory = require('../../utils/configManagers/configFactory')
const BlockConfigManager = require('../../utils/configManagers/blockConfigManager')

const setAppblockVersion = async (blockName) => {
  const configPath = path.resolve(BB_CONFIG_NAME)
  const { manager, error } = await ConfigFactory.create(configPath)
  if (error) {
    if (error.type !== 'OUT_OF_CONTEXT') throw error
    throw new Error('Please run the command inside package context ')
  }

  const { name: abBlockName, supportedAppblockVersions } = manager.config

  let existingData = supportedAppblockVersions
  let selectedBlocks = [manager]

  if (!(manager instanceof BlockConfigManager)) {
    const allMembers = await manager.getAllLevelAnyBlock()
    selectedBlocks = [...selectedBlocks, ...allMembers]
  }

  if (blockName && blockName !== abBlockName) {
    if (manager instanceof BlockConfigManager) {
      throw new Error(`No block found in ${abBlockName}.`)
    }

    const memberBlock = await manager.getAnyBlock(blockName)
    selectedBlocks = [memberBlock]
    if (!(memberBlock instanceof BlockConfigManager)) {
      const allMembers = await memberBlock.getAllLevelAnyBlock()
      selectedBlocks = [...selectedBlocks, ...allMembers]
    }
    existingData = memberBlock.config.supportedAppblockVersions
  }

  try {
    spinnies.add('at', { text: `Getting appblock versions` })
    const abVersions = await getAllAppblockVersions()
    spinnies.remove('at')
    spinnies.stopAll()

    if (!abVersions.data?.length) {
      throw new Error(`No appblock versions found`)
    }

    const choices = abVersions.data
      ?.filter(({ version }) => !existingData.includes(version))
      .map(({ version }) => ({
        name: version,
        value: version,
      }))

    if (!choices?.length) {
      throw new Error(`Already added support for all appblock versions`)
    }

    const newAppblockVersion = await readInput({
      type: 'list',
      name: 'abVersions',
      message: 'Select the appblock version',
      choices,
      validate: (input) => {
        if (!input || input?.length < 1) return `Please select a appblock version`
        return true
      },
    })

    const updatedAppblockVersions = [...existingData, newAppblockVersion]

    await checkIsAllBlockSupportDependencies(selectedBlocks, [newAppblockVersion])

    selectedBlocks.forEach((bManager) => {
      const sav = bManager.config.supportedAppblockVersions || []
      bManager.updateConfig({
        supportedAppblockVersions: [...new Set(sav.concat(updatedAppblockVersions))],
      })
    })

    spinnies.add('at')
    spinnies.succeed('at', { text: 'appblock version added successfully' })
  } catch (err) {
    spinnies.add('at')
    spinnies.fail('at', { text: err.message })
  }
}

module.exports = setAppblockVersion

// spinnies.add('at', { text: `Getting block versions` })
// const bv = await getAllBlockVersions(blockId, {})
// spinnies.remove('at')

// if (bv.data.err) {
//   throw new Error(bv.data.msg)
// }

// const blockVersions = bv.data?.data || []
// let supportToBlockVersion = 'current'

// if (blockVersions.length) {
//   const bvChoices = blockVersions.map(({ version_number, id }) => ({
//     name: `${blockName || abBlockName}@${version_number}`,
//     value: id,
//   }))
//   bvChoices.unshift({ name: 'Add support to current ', value: 'current' })

//   supportToBlockVersion = await readInput({
//     type: 'list',
//     name: 'supportToBlockVersion',
//     message: 'Select the block version',
//     choices: bvChoices,
//     validate: (input) => {
//       if (!input || input?.length < 1) return `Please select block version`
//       return true
//     },
//   })

//   spinnies.add('at', { text: `Getting linked appblock versions` })
//   const abVers = await getAllAppblockVersions({
//     block_version_id: supportToBlockVersion,
//   })
//   spinnies.remove('at')
//   existingData = abVers.data?.map(({ version }) => version) || []
// } else {
//   console.warn('No block versions found. Adding support to current ')
// }

// if (supportToBlockVersion !== 'current') {
//   // update in db
//   await post(linkAbVersionBlockVersion, {
//     block_id: blockId,
//     block_version_id: supportToBlockVersion,
//     appblock_versions: [newAppblockVersion],
//   })
// }
