#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const log = require('../subcommands/log')

const program = new Command()

program
  .argument('[block-name]', 'Name of a live block')
  .option('-e,--err', 'Watch error logs')
  .option('-o,--out', 'Watch out logs')
  .option('-l,--lines <lines>', 'Previous lines of logs (default 15 lines)', 15)
  .action(log)

program.parse(process.argv)
