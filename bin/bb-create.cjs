#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command, Option } = require('commander')
const { blockTypeInverter } = require('../utils/blockTypeInverter')
const { blockTypes } = require('../utils/blockTypes')
const create = require('../subcommands/create')

const program = new Command()

program
  .argument('<component>', 'name of component')
  .allowExcessArguments(false)
  .addOption(
    new Option('-t, --type <component-type>', 'type  of comp')
      .choices(blockTypes.map((t) => t[0]))
      .argParser((s) => blockTypeInverter(s))
  )
  .option('--no-autoRepo')
  .option('-rt, --repo-type <repo-type>', 'repository type')
  .option('-l, --language <language>', 'language')
  .action(create)

program.parse(process.argv)
