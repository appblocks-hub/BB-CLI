#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const {Command} = require('commander')
const config = require('../subcommands/config')

const program = new Command()

// eslint-disable-next-line no-unused-vars
function configSetOptionParse(value, _) {
  const a = value.split(',')
  const p = {}
  a.forEach((v) => {
    const [k, val] = v.split('=')
    p[k] = val
  })
  return p
}

program
  .option('-l,--list', 'To list all values')
  .option('-d,--delete <key>', 'To delete a value')
  .option('-s,--set <key> <value>', 'To set value', configSetOptionParse)
  .action(config)


  program.parse(process.argv)