#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const runTest = require('../subcommands/runTest')

const program = new Command()

program
  .option('-g, --global', 'execute globally')
  .option('-in,--inside <blocks...>', 'inside which block?', [])
  .action(runTest)

program.parse(process.argv)
