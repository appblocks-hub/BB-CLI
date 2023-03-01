#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const addTags = require('../subcommands/addTags')

const program = new Command()

program.option('-all, --all', 'Add tags to all blocks').action(addTags)

program.parse(process.argv)
