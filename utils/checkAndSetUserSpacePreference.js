/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { prompt } = require('inquirer')
const { configstore } = require('../configstore')
const { appConfig } = require('./appconfigStore')
const { feedback } = require('./cli-feedback')
const { lrManager } = require('./locaRegistry/manager')
const { confirmationPrompt } = require('./questionPrompts')
const { listSpaces } = require('./spacesUtils')

async function checkSpaceLinkedToPackageBlock(cmd) {
  if (cmd === 'pull') return true

  // check space is linked with package block
  await appConfig.init(null, null, cmd)
  if (appConfig.isInAppblockContext || appConfig.isInBlockContext) {
    if (appConfig.isInBlockContext && !appConfig.isInAppblockContext) {
      await appConfig.init('../', null, cmd, { reConfig: true })
    }

    const { name, blockId } = appConfig.config
    await lrManager.init()

    const spaceId = configstore.get('currentSpaceId')

    if (!spaceId || !lrManager.isSpaceLinkedToPackageBlock(blockId, spaceId)) {
      const { space_name, space_id } = await lrManager.linkedSpaceOfPackageBlock(name, blockId)

      if (!space_name) return false

      if (space_id === spaceId) return true

      const switchSpace = await confirmationPrompt({
        name: 'switchSpace',
        message: `${name} package block is under space ${space_name}. Do you want to set space to ${space_name}`,
        default: true,
      })

      if (!switchSpace) {
        feedback({ type: 'error', message: `Access denied for current space` })
        process.exit(0)
      }

      // TODO: Check for space existance
      configstore.set('currentSpaceName', space_name)
      configstore.set('currentSpaceId', space_id)

      feedback({ type: 'success', message: `Current Space: ${configstore.get('currentSpaceName')}` })
    }
  }

  return false
}

async function checkAndSetUserSpacePreference(cmd) {
  const currentSpaceName = configstore.get('currentSpaceName')

  if (!currentSpaceName) {
    try {
      const isLinked = await checkSpaceLinkedToPackageBlock(cmd)
      if (isLinked) return

      const res = await listSpaces()
      if (res.data.err) {
        feedback({ type: 'error', message: res.data.msg })
        process.exit(1)
      }
      /**
       * @type {Array<import('./jsDoc/types').spaceDetails>}
       */
      const Data = res.data.data
      const question = [
        {
          type: 'list',
          message: 'Choose a space to continue',
          choices: Data.map((v) => ({ name: v.space_name, value: { id: v.space_id, name: v.space_name } })),
          name: 'spaceSelect',
        },
      ]
      const {
        spaceSelect: { name, id },
      } = await prompt(question)
      configstore.set('currentSpaceName', name)
      configstore.set('currentSpaceId', id)
    } catch (err) {
      // TODO: feedback here
      process.exit(1)
    }
  } else {
    // TODO: check and validate the existence of the space,
    // If the call to list spaces fails here continue with the
    // present space name and hope it works.No need to abort then.
    // If the space is not present in the returned list, prompt for new space selection
    feedback({ type: 'success', message: `Current Space: ${currentSpaceName}` })
    await checkSpaceLinkedToPackageBlock(cmd)
  }
}
module.exports = checkAndSetUserSpacePreference
