#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const createBlockVersion = require('../subcommands/createBlockVersion')

const program = new Command()

program.argument('[block-name]', 'Name of block to create-version').action(createBlockVersion)

program.parse(process.argv)
