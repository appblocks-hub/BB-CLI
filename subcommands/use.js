/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const chalk = require('chalk')
const { prompt } = require('inquirer')
const { configstore } = require('../configstore')
const { feedback } = require('../utils/cli-feedback')
const { listSpaces } = require('../utils/spacesUtils')
const { BB_CONFIG_NAME } = require('../utils/constants')
const ConfigFactory = require('../utils/configManagers/configFactory')

/**
 * Prompt question set the selected answers to config space details
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

  configstore.set('currentSpaceName', name)
  configstore.set('currentSpaceId', id)

  feedback({ type: 'success', message: `${name} set` })
}
/**
 *
 * @param {String?} spaceName Name of space
 * @returns
 */
const use = async (spaceName) => {
  // check space is linked with block
  const currentSpaceName = configstore.get('currentSpaceName')

  const configPath = path.resolve(BB_CONFIG_NAME)
  const { error } = await ConfigFactory.create(configPath)
  if (error) {
    if (error.type !== 'OUT_OF_CONTEXT') throw error
  } else if (currentSpaceName) {
    console.log(chalk.dim(`current space is ${currentSpaceName}`))
    feedback({ type: 'error', message: `Switching spaces is not allowed inside package context` })
    process.exit(0)
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
      await promptAndSetSpace(Data)
      return
    }
    const spaceDetails = Data.filter((v) => v.space_name === spaceName)[0]
    if (!spaceDetails) {
      // if User given space name is not present, prompt the user with available space names
      feedback({ type: 'error', message: `${spaceName} doesn't exist` })
      await promptAndSetSpace(Data)
    } else {
      configstore.set('currentSpaceName', spaceDetails.space_name)
      configstore.set('currentSpaceId', spaceDetails.space_id)
      feedback({ type: 'success', message: `${spaceName} set` })
    }
  } catch (err) {
    feedback({ type: 'error', message: err.message })
  }
}

module.exports = use
