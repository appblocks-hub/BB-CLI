/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const { existsSync } = require('fs')
const { readFile } = require('fs/promises')
const { feedback } = require('../utils/cli-feedback')
const { post } = require('../utils/axios')
const { upsertPreviewEnvVariable } = require('../utils/api')
const ConfigFactory = require('../utils/configManagers/configFactory')
const { BB_CONFIG_NAME } = require('../utils/constants')
const { spinnies } = require('../loader')
const { getAllBlockVersions } = require('../utils/registryUtils')
const { readInput } = require('../utils/questionPromptsV2')

const setPreviewEnvVariable = async (args, options) => {
  try {
    const envPath = options.filePath

    if (args.length > 0 && envPath !== '.env.preview') {
      throw new Error(`Found both arguments and file path.\nPlease provide either variables as arguments or file`)
    }

    let variableData = []
    if (args.length > 0) {
      variableData = args
    } else {
      if (!existsSync(envPath)) throw new Error(`File not found`)
      const envFileData = await readFile(envPath, 'utf8')
      variableData = envFileData.split('\n')
    }

    spinnies.add('cr', { text: 'Initializing Config' })
    const manager = await initializeConfig()
    spinnies.remove('cr')

    if (manager.config.type !== 'package') {
      throw new Error('Please run the command inside package')
    }

    const { blockId } = manager.config
    spinnies.add('bv', { text: `Checking block versions` })
    const bkRes = await getAllBlockVersions(blockId)
    spinnies.remove('bv')

    const bkResData = bkRes.data?.data || []

    if (bkResData.length < 1) {
      throw new Error('No block versions found')
    }

    const blockVersions = bkResData.map((d) => ({
      name: d.version_number,
      value: d.id,
    }))

    const blockVersionId = await readInput({
      type: 'list',
      name: 'blockVersionId',
      message: 'Select the block version',
      choices: blockVersions,
    })

    variableData = variableData.reduce((a, eData) => {
      const equalIndex = eData.indexOf('=')
      const key = eData.substring(0, equalIndex)
      const value = eData.substring(equalIndex + 1)
      if (key?.length) a.push({ key, value })
      return a
    }, [])

    spinnies.add('bv', { text: `Saving environment variables` })
    const { error } = await post(upsertPreviewEnvVariable, {
      variables: variableData,
      block_version_id: blockVersionId,
    })
    spinnies.remove('bv')

    if (error) throw error

    spinnies.stopAll()
    feedback({ type: 'success', message: 'Environment variables saved successfully' })
  } catch (err) {
    spinnies.stopAll()
    feedback({ type: 'error', message: err.message })
  }
}

async function initializeConfig() {
  const configPath = path.resolve(BB_CONFIG_NAME)
  const { manager: configManager, error } = await ConfigFactory.create(configPath)
  if (error) {
    if (error.type !== 'OUT_OF_CONTEXT') throw error
    throw new Error('Please run the command inside package context ')
  }
  return configManager
}

module.exports = setPreviewEnvVariable
