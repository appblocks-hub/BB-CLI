#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const createEnv = require('../subcommands/createEnv')

const program = new Command()

program.action(createEnv)

program.parse(process.argv)
