#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const createVersion = require('../subcommands/createVersion')
const checkAndSetGitConnectionPreference = require('../utils/checkAndSetGitConnectionStrategy')
const checkAndSetUserSpacePreference = require('../utils/checkAndSetUserSpacePreference')
const { ensureUserLogins } = require('../utils/ensureUserLogins')

const program = new Command().hook('preAction', async () => {
  await ensureUserLogins()
  await checkAndSetGitConnectionPreference()
  await checkAndSetUserSpacePreference()
})

program
  .argument('[block-name]', 'Name of block to create-version')
  .option('--latest', 'Select the latest version of member blocks on package version create')
  .action(createVersion)

program.parse(process.argv)
