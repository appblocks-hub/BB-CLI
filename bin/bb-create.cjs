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
const checkAndSetUserSpacePreference = require('../utils/checkAndSetUserSpacePreference')
const { ensureUserLogins } = require('../utils/ensureUserLogins')
const { isGitInstalled } = require('../utils/gitCheckUtils')

const program = new Command().hook('preAction', async (_, actionCommand) => {
  const noRepo = !actionCommand._optionValues?.repo
  if (!isGitInstalled()) {
    console.log('Git not installed')
    process.exitCode = 1
    return
  }
  await ensureUserLogins(noRepo)
  await checkAndSetGitConnectionPreference()
  await checkAndSetUserSpacePreference()
})

program
  .argument('<component>', 'name of component')
  .addOption(
    new Option('-t, --type <component-type>', 'type  of comp')
      .choices(
        blockTypes.reduce((acc, v) => {
          if (v[0] !== 'package') return acc.concat(v[0])
          return acc
        }, [])
      )
      .argParser((s) => blockTypeInverter(s))
  )
  .option('--no-autoRepo')
  .action(create)

program.parse(process.argv)
