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
const { getAttchedLanguageVersions } = require('../util')

const listLanguageVersionCommand = async (blockName) => {
  await appConfig.init(null, null)

  if (!appConfig.has(blockName)) {
    console.log('Block not found!')
    process.exit(1)
  }

  try {
    const blockId = await appConfig.getBlockId(blockName)
    spinnies.add('p1', { text: `Getting blocks versions` })
    const { data } = await getAllBlockVersions(blockId)

    const blockVersions = data.data?.map((d) => ({
      name: d.version_number,
      value: d.id,
    }))
    spinnies.remove('p1')

    if (!blockVersions || blockVersions?.length < 1) {
      console.log('Please publish the block to add language versions')
      process.exit(1)
      return
    }

    const blockVersionId = await readInput({
      type: 'list',
      name: 'blockVersionId',
      message: 'Select the block version',
      choices: blockVersions,
    })

    spinnies.add('p1', { text: `Gettings blocks language versions` })
    const blockLanguageVersions = await getAttchedLanguageVersions(blockId, blockVersionId)

    if (!blockLanguageVersions || blockLanguageVersions?.length < 1) {
      spinnies.succeed('p1', { text: `No blocks language versions` })
      process.exit(1)
      return
    }

    spinnies.succeed('p1', {
      text: `Block language versions are listed below
             ${blockLanguageVersions.map((languageVersion) => `${languageVersion.name}@${languageVersion.version}`)}`,
    })
  } catch (error) {
    spinnies.add('p1', { text: `Error` })
    spinnies.fail('p1', { text: `Error: ${error.message}` })
  }
}

module.exports = listLanguageVersionCommand
