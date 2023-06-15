#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const ls = require('../subcommands/ls')

const program = new Command()

program
  .option('-g, --global', 'execute globally')
  .option('--no-multi', 'show all blocks in one falttened table')
  .action(ls)

program.parse(process.argv)
