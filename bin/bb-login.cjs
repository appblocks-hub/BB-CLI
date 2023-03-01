#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const login = require('../subcommands/login')

const program = new Command()

program
  .option(' --no-localhost', 'copy and paste a code instead of starting a local server for authentication')
  .action(login)

program.parse(process.argv)
