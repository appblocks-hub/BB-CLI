#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const connectRemote = require('../subcommands/connectRemote')
const { isGitInstalled } = require('../utils/gitCheckUtils')
const checkAndSetGitConnectionPreference = require('../utils/checkAndSetGitConnectionStrategy')

const program = new Command().hook('preAction', async () => {
  try {
    if (!isGitInstalled()) throw new Error('Git not installed')
    await checkAndSetGitConnectionPreference()
  } catch (error) {
    console.log(error.message)
    process.exit(1)
  }
})

program
  .option('-f, --force', 'Force with new repository')
  .option('-ssh, --ssh-url <ssh-url>', 'Git ssh url of the repository')
  .action(connectRemote)

program.parse(process.argv)
