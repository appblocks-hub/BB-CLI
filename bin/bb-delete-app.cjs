#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const deleteApp = require('../subcommands/deleteApp')

const program = new Command()

program.action(deleteApp)

program.parse(process.argv)
