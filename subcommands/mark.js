#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { readFileSync } = require('fs')
const chalk = require('chalk')
const axios = require('axios')
const { getBlockDetails } = require('../utils/registryUtils')
const { appBlockAddBlockMapping } = require('../utils/api')
const { getShieldHeader } = require('../utils/getHeaders')
const { spinnies } = require('../loader')
const { feedback } = require('../utils/cli-feedback')

const mark = async (options) => {
  const { dependency, composability } = options

  let blockOne
  let blockTwo
  let relationType

  if (dependency && composability) {
    feedback({ type: 'error', message: 'Not possible to mark as dependent and composible' })
    return
  }

  if (dependency) {
    if (dependency.length > 2) {
      feedback({ type: 'info', message: 'Only the first two blocks will be used.' })
    }

    relationType = 1
    ;[blockOne, blockTwo] = dependency
  } else if (composability) {
    if (composability.length > 2) {
      feedback({ type: 'info', message: 'Only the first two blocks will be used.' })
    }

    relationType = 2
    ;[blockOne, blockTwo] = composability
  } else {
    feedback({ type: 'warn', message: 'No options provided' })
    feedback({
      type: 'info',
      message: `Use ${chalk.italic.dim('--dependency')} or ${chalk.italic.dim('--composability')}`,
    })
    feedback({ type: 'info', message: `Use ${chalk.italic.dim('block mark --help')} to learn to use mark command` })
    return
  }

  let appConfig

  try {
    appConfig = JSON.parse(readFileSync('appblock.config.json'))
  } catch (err) {
    if (err.code === 'ENOENT') {
      feedback({ type: 'error', message: 'appblock.config.json missing' })
      return
    }
    feedback({ type: 'error', message: 'Something went wrong when reading appblock.config.json' })
    feedback({ type: 'info', message: err.message })
    return
  }
  const appblock = appConfig.name
  const { dependencies } = appConfig

  if (dependencies) {
    if (!dependencies[blockOne]) {
      feedback({ type: 'error', message: `Can't find ${blockOne} in ${appblock}'s depenedencies..` })
      return
    }
    if (!dependencies[blockTwo]) {
      feedback({ type: 'error', message: `Can't find ${blockTwo} in ${appblock}'s depenedencies..` })
      return
    }
  }

  const blockNames = [blockOne, blockTwo, appblock]
  const blockMetaDatas = {}

  spinnies.add('mark', { text: 'Starting..' })
  spinnies.update('mark', { text: 'Getting block details' })

  await Promise.all(blockNames.map((v) => getBlockDetails(v)))
    .then((values) => {
      values.forEach((v, i) => {
        if (v.status === 204) {
          feedback({ type: 'error', message: `${blockNames(i)} doesn't exist in block repository!` })
          process.exit(1)
        } else {
          if (v.data.err) {
            feedback({ type: 'error', message: v.data.msg })
            process.exit(1)
          }
          blockMetaDatas[blockNames[i]] = v.data.data
        }
      })
    })
    .catch((err) => {
      feedback({ type: 'error', message: err.message })
      process.exit(1)
    })

  let isAPI = false
  if ([4, 6].includes(blockMetaDatas[blockOne].BlockType) || [4, 6].includes(blockMetaDatas[blockTwo].BlockType)) {
    if ([2, 3].includes(blockMetaDatas[blockOne].BlockType) || [2, 3].includes(blockMetaDatas[blockTwo].BlockType)) {
      isAPI = true
    }
  }

  const data = {
    block_id: blockMetaDatas[blockOne].ID,
    related_block_id: blockMetaDatas[blockTwo].ID,
    app_block_id: blockMetaDatas[appblock].ID,
    is_api: isAPI,
    relation_type: relationType,
  }

  spinnies.update('mark', { text: 'Connecting to registry' })
  try {
    const resp = await axios.post(appBlockAddBlockMapping, { ...data }, { headers: getShieldHeader() })
    if (resp.data.err) {
      spinnies.fail('mark', { text: 'Something went wrong at our end' })
      feedback({ type: 'error', message: resp.data.err })
      feedback({ type: 'info', message: resp.data.msg })
    } else {
      spinnies.succeed('mark', { text: 'Successfully mapped..' })
    }
  } catch (err) {
    spinnies.fail('mark', { text: 'Something went south while creating block mapping' })
    feedback({ type: 'info', message: err.message })
  }
}

module.exports = mark
