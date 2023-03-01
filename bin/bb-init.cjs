#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const init = require('../subcommands/init')

const program = new Command()

program
.argument('<appblock-name>', 'Name of app')
.option('--no-autoRepo')
.description('create an appblock')
.action(init)


program.parse(process.argv)
