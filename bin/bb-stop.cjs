#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const stop = require('../subcommands/stop')

const program = new Command()

program
  .argument('[name]', 'Name of block to stop')
  .option('-g, --global', 'execute globally')
  .action(stop)

program.parse(process.argv)
