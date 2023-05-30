#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const exec = require('../subcommands/exec-v2')

const program = new Command()

program
  .argument('<command>', 'command to run in quotes.eg:"ls"')
  .option('-in,--inside <blocks...>', 'inside which block?', [])
  .option('-t,--types <types...>', 'inside specific types', [])
  .option('-g,--groups <groups...>', 'in a folder', [])
  .option('-l,--limit <limit>', 'level', -1)
  .action(exec)

program.parse(process.argv)
