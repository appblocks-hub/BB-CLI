#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const listLanguageVersionCommand = require('../subcommands/languageVersion/list')

const program = new Command()

program.argument('<block-name>', 'Name of block to list language version').action(listLanguageVersionCommand)

program.parse(process.argv)
