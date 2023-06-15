/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { prompt } = require('inquirer')
const { headLessConfigStore } = require('../configstore')
const { feedback } = require('../utils/cli-feedback')
const { listSpaces } = require('../utils/spacesUtils')
const { BB_CONFIG_NAME } = require('../utils/constants')
const ConfigFactory = require('../utils/configManagers/configFactory')
const BlockConfigManager = require('../utils/configManagers/blockConfigManager')



/**
 * Prompt question set the seleted answers to config space details
 * @param {import('../utils/jsDoc/types').spaceDetails} Data
 */
const promptAndSetSpace = async (Data) => {
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

  headLessConfigStore().set('currentSpaceName', name)
  headLessConfigStore().set('currentSpaceId', id)

  feedback({ type: 'success', message: `${name} set` })
}
/**
 *
 * @param {String?} space_name Name of space
 * @returns
 */
const use = async (space_name) => {
  // check space is linked with block
  const currentSpaceName = headLessConfigStore().get('currentSpaceName')

  const configPath = path.resolve(BB_CONFIG_NAME)
  const { error, manager: configManager } = await ConfigFactory.create(configPath)
  if (error) {
    if (error.type !== 'OUT_OF_CONTEXT') throw error
    throw new Error('Please run the command inside package context ')
  } else if (configManager instanceof BlockConfigManager) {
    throw new Error('Please run the command inside package context ')
  }

  if (space_name && currentSpaceName === space_name) {
    feedback({ type: 'info', message: `${space_name} is already set` })
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
    if (!space_name) {
      // if space name is not given, prompt the user with available space names
      await promptAndSetSpace(Data)
      return
    }
    const spaceDetails = Data.filter((v) => v.space_name === space_name)[0]
    if (!spaceDetails) {
      // if User given space name is not present, prompt the user with available space names
      feedback({ type: 'error', message: `${space_name} doesn't exist` })
      await promptAndSetSpace(Data)
    } else {
      headLessConfigStore().set('currentSpaceName', spaceDetails.space_name)
      headLessConfigStore().set('currentSpaceId', spaceDetails.space_id)
      feedback({ type: 'success', message: `${space_name} set` })
    }
  } catch (err) {
    feedback({ type: 'error', message: err.message })
  }
}

module.exports = use
