#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const deploy = require('../subcommands/deploy')

const program = new Command()

program
  .option('-rv, --release-version <release_version>', 'version number')
  .option('-rn, --release-note <release_note>', 'release note')
  .option('-env, --environment <environment>', 'environment')
  .option('-cn, --config-name <config-name>', 'Name of the configuration')
  .action(deploy)

program.parse(process.argv)
