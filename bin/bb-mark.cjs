#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const mark = require('../subcommands/mark')
const checkAndSetGitConnectionPreference = require('../utils/checkAndSetGitConnectionStrategy')
const checkAndSetUserSpacePreference = require('../utils/checkAndSetUserSpacePreference')
const { ensureUserLogins } = require('../utils/ensureUserLogins')
const { isGitInstalled } = require('../utils/gitCheckUtils')

const program = new Command().hook('preAction', async () => {
  if (!isGitInstalled()) {
    console.log('Git not installed')
    process.exitCode = 1
    return
  }
  await ensureUserLogins()

  await checkAndSetGitConnectionPreference()
  await checkAndSetUserSpacePreference()
})

program
  .option('-d,--dependency <blocks...>', 'Create dependency')
  .option('-c,--composability <blocks...>', 'Create composability')
  .action(mark)

program.parse(process.argv)
