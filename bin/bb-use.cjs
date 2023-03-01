#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const use = require('../subcommands/use')

const program = new Command()

program.argument('[space_name]', 'Name of space to use').action(use)

program.parse(process.argv)
