#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const chalk = require('chalk')
const createVersion = require('../subcommands/createVersion')
const checkAndSetGitConnectionPreference = require('../utils/checkAndSetGitConnectionStrategy')
const checkAndSetUserSpacePreference = require('../utils/checkAndSetUserSpacePreference')
const { ensureUserLogins } = require('../utils/ensureUserLogins')

const program = new Command().hook('preAction', async () => {
  try {
    await ensureUserLogins()
    await checkAndSetGitConnectionPreference()
    await checkAndSetUserSpacePreference('create-version')
  } catch (error) {
    console.log(chalk.red(error.response?.data.message || error.message))
    process.exit(1)
  }
})

program
  .argument('[block-name]', 'Name of block to create-version')
  .option('-v, --version <version>', 'New sematic version')
  .option('-vn, --version-note <version-note>', 'Version note for new version')
  .option('-f, --force', 'Discard all waring prompt and force the create version')
  .option('-l, --latest', 'Select the latest version of member blocks on package version create')
  .option('-p, --packageonly', 'Create package version for preview')
  .action(createVersion)

program.parse(process.argv)
