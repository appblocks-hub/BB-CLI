#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command} = require('commander')
const start = require('../subcommands/start')

const program = new Command()

program
.argument('[name]', 'Name of block to start')
.option('--use-pnpm', 'use pnpm to install dependencies')
.action(start)

program.parse(process.argv)
