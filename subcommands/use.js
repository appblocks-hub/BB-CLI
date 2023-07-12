/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const path = require('path')
const chalk = require('chalk')
const { prompt } = require('inquirer')
const { headLessConfigStore, configstore } = require('../configstore')
const { feedback } = require('../utils/cli-feedback')
const { listSpaces } = require('../utils/spacesUtils')
const { BB_CONFIG_NAME } = require('../utils/constants')
const ConfigFactory = require('../utils/configManagers/configFactory')
const BlockConfigManager = require('../utils/configManagers/blockConfigManager')

/**
 * Prompt question set the selected answers to config space details
 * @param {import('../utils/jsDoc/types').spaceDetails} Data
 */
const promptAndSetSpace = async (Data, isOutOfContext) => {
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

  if (isOutOfContext) {
    configstore.set('currentSpaceName', name)
    configstore.set('currentSpaceId', id)
  } else {
    headLessConfigStore().set('currentSpaceName', name)
    headLessConfigStore().set('currentSpaceId', id)
  }

  feedback({ type: 'success', message: `${name} set` })
}
/**
 *
 * @param {String?} spaceName Name of space
 * @returns
 */
const use = async (spaceName) => {
  // check space is linked with block
  const currentSpaceName = headLessConfigStore().get('currentSpaceName')
  let isOutOfContext = false

  const configPath = path.resolve(BB_CONFIG_NAME)
  const { error, manager: configManager } = await ConfigFactory.create(configPath)
  if (error) {
    if (error.type !== 'OUT_OF_CONTEXT') throw error
    isOutOfContext = true
  } else if (configManager instanceof BlockConfigManager) {
    throw new Error('Please run the command inside package context ')
  }

  if (spaceName && currentSpaceName === spaceName) {
    feedback({ type: 'info', message: `${spaceName} is already set` })
    process.exit(0)
  }

  console.log(chalk.dim(`current space is ${currentSpaceName}`))

  try {
    const res = await listSpaces()
    if (res.data.err) {
      feedback({ type: 'error', message: res.data.msg })
      process.exit(1)
    }
    /**
     * @type {import('../utils/jsDoc/types').spaceDetails}
     */
    const Data = res.data.data
    if (!spaceName) {
      // if space name is not given, prompt the user with available space names
      await promptAndSetSpace(Data, isOutOfContext)
      return
    }
    const spaceDetails = Data.filter((v) => v.spaceName === spaceName)[0]
    if (!spaceDetails) {
      // if User given space name is not present, prompt the user with available space names
      feedback({ type: 'error', message: `${spaceName} doesn't exist` })
      await promptAndSetSpace(Data, isOutOfContext)
    } else {
      if (isOutOfContext) {
        configstore.set('currentSpaceName', spaceDetails.spaceName)
        configstore.set('currentSpaceId', spaceDetails.space_id)
      } else {
        headLessConfigStore().set('currentSpaceName', spaceDetails.spaceName)
        headLessConfigStore().set('currentSpaceId', spaceDetails.space_id)
      }
      feedback({ type: 'success', message: `${spaceName} set` })
    }
  } catch (err) {
    feedback({ type: 'error', message: err.message })
  }
}

module.exports = use
