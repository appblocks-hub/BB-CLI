#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const push_config = require('../subcommands/push_config')

const program = new Command()

program.action(push_config)

program.parse(process.argv)
