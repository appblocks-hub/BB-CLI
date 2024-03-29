#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const tempSync = require('../subcommands/sync')
const checkAndSetGitConnectionPreference = require('../utils/checkAndSetGitConnectionStrategy')

// const { ensureUserLogins } = require('../utils/ensureUserLogins')
const { isGitInstalled } = require('../utils/gitCheckUtils')
const { ensureGitAndShieldLogins } = require('../utils/ensureGitAndShieldLogins')

const program = new Command().hook('preAction', async (_, actionCommand) => {
  const noRepo = !actionCommand._optionValues?.repo
  if (!isGitInstalled()) {
    console.log('Git not installed')
    process.exitCode = 1
    return
  }
  await ensureGitAndShieldLogins(noRepo)
  await checkAndSetGitConnectionPreference()
})

program
  .action(tempSync)
  .argument('[name]', 'Name of block to sync')
  .option('-cc, --clear-cache ', 'Clear sync bb_modules')

program.parse(process.argv)
