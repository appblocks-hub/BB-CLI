#!/usr/bin/env node

/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')

const program = new Command()

// program
//   .option('-f, --force', 'force connect');

program.parse(process.argv)

// const args = program.args;
// configstore.delete('user')
//     configstore.delete('token')
console.log('Logout is not implemented yet!')
