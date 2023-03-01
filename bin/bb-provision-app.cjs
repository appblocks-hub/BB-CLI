#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const provisionApp = require('../subcommands/provisionApp')

const program = new Command()

program.argument('<app_id>', 'Id of app to provision').action(provisionApp)

program.parse(process.argv)
