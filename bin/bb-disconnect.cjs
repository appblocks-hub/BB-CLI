#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const disconnect = require('../subcommands/disconnect')

const program = new Command()

program.argument('<service>', 'service to disconnect (github)').action(disconnect)

program.parse(process.argv)
