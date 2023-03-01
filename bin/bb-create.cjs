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
  .addOption(
    new Option('-t, --type <component-type>', 'type  of comp')
      .choices(
        blockTypes.reduce((acc, v) => {
          if (v[0] !== 'package') return acc.concat(v[0])
          return acc
        }, [])
      )
      .argParser((s) => blockTypeInverter(s))
  )
  .option('--no-autoRepo')
  .action(create)

program.parse(process.argv)
