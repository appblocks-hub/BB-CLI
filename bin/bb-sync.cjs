#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const tempSync = require('../subcommands/tempSync')
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

program.action(tempSync)

program.parse(process.argv)


