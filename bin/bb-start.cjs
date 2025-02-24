#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const start = require('../subcommands/start')

const program = new Command()

program
  .argument('[name]', 'Name of block to start')
  .option('--use-pnpm', 'use pnpm to install dependencies')
  .option('--multi-instance', 'multi instance')
  .option('-env, --environment <environment>', 'environment')
  .option('-bt, --block-type <block-type>', 'Block type to start')
  .option('-pm2, --pm2', 'Start functions with pm2')
  .option('-bo, --build-only', 'Just build view blocks')
  .option('-rfn, --remote-file-name <remote-file-name>', 'Custom remote entry file name for elements')
  .option('-nsc, --no-sub-container', 'To start all sub container')
  .option('-f, --force', 'To clear cache and start')
  .action(start)

program.parse(process.argv)
