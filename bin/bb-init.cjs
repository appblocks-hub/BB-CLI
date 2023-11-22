#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const init = require('../subcommands/init')

const program = new Command()

program
  .argument('<package-name>', 'Name of app')
  .option('-lang, --language <language>', 'Set the language for templates')
  .option('-p, --plugin <plugin>', 'Set the plugin for language')
  .option('-po, --plugin-option <plugin-option>', 'Add the plugin option for provided plugin')
  .option('-cp, --config-path <config-path>', 'Set bb.config.js path')
  .option('-raw, --raw-package', 'Create raw package version for preview')
  .description('create an appblock')
  .action(init)

program.parse(process.argv)
