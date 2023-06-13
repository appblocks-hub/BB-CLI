#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const log = require('../subcommands/logV2')

const program = new Command()

program.argument('[block-name]', 'Name of a live block').action(log)

program.parse(process.argv)
