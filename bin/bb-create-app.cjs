#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const createApp = require('../subcommands/createApp')

const program = new Command()

program.action(createApp)

program.parse(process.argv)
