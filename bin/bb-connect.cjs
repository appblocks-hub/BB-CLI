#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const connect = require('../subcommands/connect')

const program = new Command()

program
  .argument('<service>', 'Name of service to connect')
  .option('-f, --force', 'force connect will remove existing tokens and restart login')
  .action(connect)

program.parse(process.argv)
