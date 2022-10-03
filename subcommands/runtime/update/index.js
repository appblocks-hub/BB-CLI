/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { spinnies } = require('../../../loader')
const { appConfig } = require('../../../utils/appconfigStore')
const { readInput } = require('../../../utils/questionPrompts')
const { getAllBlockVersions } = require('../../../utils/registryUtils')
const { getUpdatedRuntimesData, updateRuntimes } = require('../util')

const updateRuntimeCommand = async (blockName) => {
  await appConfig.init(null, null)

  if (!appConfig.has(blockName)) {
    console.log('Block not found!')
    process.exit(1)
  }

  try {
    const blockDetails = appConfig.getBlock(blockName)
    const blockId = await appConfig.getBlockId(blockName)
    const { data } = await getAllBlockVersions(blockId)
    const blockVersions = data.data
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .map((d) => ({
        name: d.version_number,
        value: d.id,
      }))

    if (!blockVersions) {
      console.log('Please publish the block to add runtime')
      process.exit(1)
      return
    }

    const blockVersionId = await readInput({
      type: 'list',
      name: 'blockVersionId',
      message: 'Select the block version',
      choices: blockVersions,
    })

    const { addRuntimesList, deleteRuntimesList } = await getUpdatedRuntimesData({
      blockDetails,
      blockId,
      blockVersionId,
    })

    spinnies.add('p1', { text: `Attaching runtime to block` })
    await updateRuntimes({ blockVersionId, blockId, addRuntimesList, deleteRuntimesList })
    spinnies.succeed('p1', { text: `Attaching runtime to block` })
  } catch (error) {
    spinnies.add('p1', { text: `Error` })
    spinnies.fail('p1', { text: `Error: ${error.message}` })
  }
}

module.exports = updateRuntimeCommand
