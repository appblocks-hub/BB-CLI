#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')

const checkAndSetGitConnectionPreference = require('../utils/checkAndSetGitConnectionStrategy')
const checkAndSetUserSpacePreference = require('../utils/checkAndSetUserSpacePreference')
const { ensureUserLogins } = require('../utils/ensureUserLogins')
const { isGitInstalled } = require('../utils/gitCheckUtils')
const pull = require('../subcommands/pullV2')

const program = new Command().hook('preAction', async () => {
  if (!isGitInstalled()) {
    console.log('Git not installed')
    process.exitCode = 1
    return
  }
  await ensureUserLogins()
  await checkAndSetGitConnectionPreference()
  await checkAndSetUserSpacePreference('pull')
})

program
  .argument('[component]', 'Name of component with version. (eg: @[spaceName]/[blockName]@[version])')
  .option('--add-variant', 'Add as variant')
  .option('--no-variant', 'No variant')
  .option('-t, --type <variantType>', 'Type of variant to create')
  .option('--id', 'For passing Block ID')
  .action(pull)

program.parse(process.argv)
