#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command, Option } = require('commander')
const { blockTypeInverter } = require('../utils/blockTypeInverter')
const { blockTypes } = require('../utils/blockTypes')
const create = require('../subcommands/create')

const checkAndSetGitConnectionPreference = require('../utils/checkAndSetGitConnectionStrategy')
const { isGitInstalled } = require('../utils/gitCheckUtils')

const program = new Command().hook('preAction', async () => {
  // const noRepo = !actionCommand._optionValues?.repo
  if (!isGitInstalled()) {
    console.log('Git not installed')
    process.exitCode = 1
    return
  }
  await checkAndSetGitConnectionPreference()
})

program
  .argument('<component>', 'name of component')
  .allowExcessArguments(false)
  .addOption(
    new Option('-t, --type <component-type>', 'type  of comp')
      .choices(blockTypes.filter((d) => d[0] !== 'package'))
      .argParser((s) => blockTypeInverter(s))
  )
  .option('--no-autoRepo')
  .action(create)

program.parse(process.argv)
