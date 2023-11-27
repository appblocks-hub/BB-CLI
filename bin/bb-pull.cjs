#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')

const { chalk } = require('chalk')
const pull = require('../subcommands/pull')
const { isGitInstalled } = require('../utils/gitCheckUtils')
const { ensureUserLogins } = require('../utils/ensureUserLogins')
const checkAndSetUserSpacePreference = require('../utils/checkAndSetUserSpacePreference')
const checkAndSetGitConnectionPreference = require('../utils/checkAndSetGitConnectionStrategy')

const program = new Command().hook('preAction', async () => {
  try {
    if (!isGitInstalled()) throw new Error('Git not installed')

    await ensureUserLogins()
    await checkAndSetGitConnectionPreference()
    await checkAndSetUserSpacePreference('pull')
  } catch (error) {
    console.log(chalk.red(error.message))
    process.exitCode = 1
  }
})

program
  .argument('<component>', 'Name of component with version. (eg: @[spaceName]/[packageName]/[blockName]@[version])')
  .argument('[newVariantName]', 'Name for variant.')
  .option('-v, --variant', 'Create as variant variant')
  .option('-nv, --no-variant', 'No variant variant')
  .option('-id, --id', 'For passing Block ID')
  .option('-t, --type <variantType>', 'Type of variant to create')
  .option('-f, --force', 'Discard all waring prompt and force pull block')
  .action(pull)

program.parse(process.argv)
