#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const push = require('../subcommands/push')

const program = new Command()

program
  .argument('[block name]', 'Name of block to push')
  .option('-f, --force', 'commit and push all blocks')
  .option('-m, --message <message>', 'commit message')
  .action(push)

program.parse(process.argv)
