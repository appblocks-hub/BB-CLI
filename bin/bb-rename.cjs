#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const blockRename = require('../subcommands/blockRename')

const program = new Command()

program
  .argument('<block_name>', 'Name of block')
  .argument('<new_block_name>', 'New name of block')
  .option('-bp, --block-path <blockPath>', 'Path of block')
  .action(blockRename)

program.parse(process.argv)
