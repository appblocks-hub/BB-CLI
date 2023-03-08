/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { readInput } = require('../../utils/questionPrompts')
const { spinnies } = require('../../loader')
const { appConfig } = require('../../utils/appconfigStore')
const { getAllAppblockVersions } = require('../publish/util')
// const { getAllBlockVersions } = require('../../utils/registryUtils')
// const { post } = require('../../utils/axios')
// const { linkAbVersionBlockVersion } = require('../../utils/api')
const { checkIsAllBlockSupportDependencies } = require('./util')

const setAppblockVersion = async (blockName) => {
  await appConfig.init()

  const { name: abBlockName, blockId: abBlockId, dependencies, supportedAppblockVersions } = appConfig.config

  let existingData = supportedAppblockVersions
  let blockId = abBlockId
  let selectedBlocks = {
    [abBlockName]: {
      supportedAppblockVersions,
    },
    ...dependencies,
  }

  if (blockName && blockName !== abBlockName) {
    selectedBlocks = { [blockName]: appConfig.getBlock(blockName) }
    existingData = selectedBlocks[blockName].meta?.supportedAppblockVersions
    blockId = selectedBlocks[blockName].meta.blockId
  }

  if (!blockId) throw new Error('Block not found')

  try {
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
      // type: 'checkbox',
      type: 'list',
      name: 'abVersions',
      message: 'Select the appblock version',
      choices,
      // default: existingData,
      validate: (input) => {
        if (!input || input?.length < 1) return `Please select a appblock version`
        return true
      },
    })

    const updatedAppblockVersions = [...existingData, newAppblockVersion]

    await checkIsAllBlockSupportDependencies(
      Object.entries(selectedBlocks).reduce((acc, [bName, bData]) => {
        if (bName !== abBlockName) acc.push(bData)
        return acc
      }, []),
      [newAppblockVersion]
    )

    // if (supportToBlockVersion !== 'current') {
    //   // update in db
    //   await post(linkAbVersionBlockVersion, {
    //     block_id: blockId,
    //     block_version_id: supportToBlockVersion,
    //     appblock_versions: [newAppblockVersion],
    //   })
    // }

    Object.entries(selectedBlocks).forEach(([bName, bData]) => {
      const sav = bData.meta?.supportedAppblockVersions || bData.supportedAppblockVersions

      if (bName === abBlockName) {
        appConfig.updateAppBlock({
          supportedAppblockVersions: [...new Set(updatedAppblockVersions)],
        })
      } else {
        appConfig.updateBlock(bName, {
          supportedAppblockVersions:
            blockName && blockName !== abBlockName
              ? [...new Set(updatedAppblockVersions)]
              : [...new Set(sav.concat(updatedAppblockVersions))],
        })
      }
    })

    spinnies.add('at')
    spinnies.succeed('at', { text: 'appblock version added successfully' })
  } catch (err) {
    spinnies.add('at')
    spinnies.fail('at', { text: err.message })
  }
}

module.exports = setAppblockVersion
