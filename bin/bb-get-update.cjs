#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const getBlockUpdate  = require('../subcommands/getBlockUpdate')

const program = new Command()

program.argument('<component>', 'Name of component').action(getBlockUpdate)

program.parse(process.argv)
