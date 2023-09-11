#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const setPreviewEnvVariable = require('../subcommands/setPreviewEnvVariable')

const program = new Command()

program
  .argument('[env...]', 'Environment variables (separated by spaces)')
  .option('-fp, --file-path <file-path>', 'file-path of env', '.env.preview')
  .action(setPreviewEnvVariable)

program.parse(process.argv)
