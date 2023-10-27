#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const init = require('../subcommands/temp-init')

const program = new Command()

program
  .argument('<package-name>', 'Name of app')
  .option('--typescript', 'use typescript templates')
  .option('-p, --packageonly', 'Create package version for preview')
  .description('create an appblock')
  .action(init)

program.parse(process.argv)
