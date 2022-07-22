#!/usr/bin/env node

/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const { readFileSync } = require('fs')
const chalk = require('chalk')
const axios = require('axios')
const Spinnies = require('spinnies')
const { getBlockDetails } = require('../utils/registryUtils')
const { ensureUserLogins } = require('../utils/ensureUserLogins')
const { appBlockAddBlockMapping } = require('../utils/api')
const { getShieldHeader } = require('../utils/getHeaders')

const spinnies = new Spinnies()
const program = new Command()

program
  .option('-d,--dependency <blocks...>', 'Create dependency')
  .option('-c,--composability <blocks...>', 'Create composability')

const mark = async (args) => {
  program.parse(args)
  const { dependency, composability } = program.opts()
  // console.log(dependency, composability)

  spinnies.add('mark', { text: 'Starting..' })
  let blockOne
  let blockTwo
  let relationType

  if (dependency) {
    if (dependency.length > 2) {
      console.log(chalk.italic.dim('Only the first two blocks will be used.'))
    }

    relationType = 1
    ;[blockOne, blockTwo] = dependency
  } else if (composability) {
    if (composability.length > 2) {
      console.log(chalk.italic.dim('Only the first two blocks will be used.'))
    }

    relationType = 2
    ;[blockOne, blockTwo] = composability
  } else {
    console.log('\nNo option provided')
    console.log(`Use ${chalk.italic.dim('--dependency')} or ${chalk.italic.dim('--composability')} `)
    console.log(`\nUse ${chalk.italic.dim('block mark --help')} to learn to use mark command`)

    process.exit(0)
  }

  // console.log(blockOne, blockTwo, relationType)
  let appConfig

  spinnies.update('mark', { text: 'Checking auths..' })
  await ensureUserLogins()
  try {
    appConfig = JSON.parse(readFileSync('appblock.config.json'))
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log(chalk.red(`appblock.config.json missing`))
      process.exit(1)
    }
    console.log('Something went wrong\n')
    console.log(err)
    process.exit(1)
  }
  const appblock = appConfig.name
  const { dependencies } = appConfig
  if (dependencies) {
    if (!dependencies[blockOne]) {
      console.log(`Can't find ${blockOne} in ${appblock}'s depenedencies..`)
      process.exit(1)
    }
    if (!dependencies[blockTwo]) {
      console.log(`Can't find ${blockTwo} in ${appblock}'s depenedencies..`)
      process.exit(1)
    }
  }

  const blockNames = [blockOne, blockTwo, appblock]
  const blockMetaDatas = {}

  await Promise.all(blockNames.map((v) => getBlockDetails(v)))
    .then((values) => {
      values.forEach((v, i) => {
        if (v.status === 204) {
          console.log(`\n ${chalk.whiteBright(blockNames(i))} doesn't exist in block repository!`)
          process.exit(1)
        } else {
          if (v.data.err) {
            console.log(v.data.msg)
            process.exit(1)
          }
          blockMetaDatas[blockNames[i]] = v.data.data
        }
      })

      // console.log(blockMetaDatas)
    })
    .catch((err) => console.log(err))
  // console.log('blockone type', blockMetaDatas[blockOne].BlockType)
  // console.log('blocktwo type', blockMetaDatas[blockTwo].BlockType)

  let isAPI = false
  if ([4, 6].includes(blockMetaDatas[blockOne].BlockType) || [4, 6].includes(blockMetaDatas[blockTwo].BlockType)) {
    // console.log('one in fn')
    if ([2, 3].includes(blockMetaDatas[blockOne].BlockType) || [2, 3].includes(blockMetaDatas[blockTwo].BlockType)) {
      // console.log('one in ui as well')
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

  // console.log(data)
  const headers = getShieldHeader()
  spinnies.update('mark', { text: 'Connecting to registry' })
  try {
    const resp = await axios.post(appBlockAddBlockMapping, { ...data }, { headers })
    if (resp.data.err) {
      console.log(`\n Somthing went wrong at our end\n`)
      console.log(resp.data.msg)
    } else {
      spinnies.succeed('mark', { text: 'done' })
      console.log(chalk.green('Successfully mapped..'))
    }
  } catch (err) {
    console.log('Something went south while creating block mapping')
    console.log(err.message)
  }
}
// To avoid calling push twice on tests
if (process.env.NODE_ENV !== 'test') mark(process.argv)
