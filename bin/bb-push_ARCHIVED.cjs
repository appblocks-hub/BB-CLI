#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const push = require('../subcommands/push')
const checkAndSetUserSpacePreference = require('../utils/checkAndSetUserSpacePreference')
const checkAndSetGitConnectionPreference = require('../utils/checkAndSetGitConnectionStrategy')
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
  .argument('[block name]', 'Name of block to push')
  .option('-f, --force', 'commit and push all blocks')
  .option('-m, --message <message>', 'commit message')
  .action(push)

program.parse(process.argv)
