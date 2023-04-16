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
const tempPush = require('../subcommands/tempPush')

const checkAndSetGitConnectionPreference = require('../utils/checkAndSetGitConnectionStrategy')

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
})

program.action(tempPush)

program.parse(process.argv)
