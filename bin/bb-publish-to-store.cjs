#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk  = require('chalk')
const { Command } = require('commander')
const publishToStore = require('../subcommands/publishToStore')
const checkAndSetUserSpacePreference = require('../utils/checkAndSetUserSpacePreference')
const { ensureUserLogins } = require('../utils/ensureUserLogins')

const program = new Command().hook('preAction', async () => {
  try {
    await ensureUserLogins()
    await checkAndSetUserSpacePreference()
  } catch (error) {
    console.log(chalk.red(error.response?.data.message || error.message))
    process.exit(1)
  }
})

program
  .argument('[block-name]', 'Name of block to publish')
  .option('-v, --version <version>', 'Version to publish')
  .action(publishToStore)

program.parse(process.argv)
