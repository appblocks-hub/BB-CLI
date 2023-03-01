#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const pull = require('../subcommands/pull')

const program = new Command()

program
  .argument('<component>', 'Name of component with version. block@0.0.1')
  .option('--add-variant', 'Add as variant')
  .option('--no-variant', 'No variant')
  .option('-t, --type <variantType>', 'Type of variant to create')
  .action(pull)

program.parse(process.argv)
