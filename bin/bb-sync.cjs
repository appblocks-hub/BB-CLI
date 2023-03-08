#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// const { default: axios } = require('axios')
const { Command } = require('commander')
const Sync = require('../subcommands/syncV2')
const checkAndSetGitConnectionPreference = require('../utils/checkAndSetGitConnectionStrategy')
const checkAndSetUserSpacePreference = require('../utils/checkAndSetUserSpacePreference')
const { ensureUserLogins } = require('../utils/ensureUserLogins')
const { isGitInstalled } = require('../utils/gitCheckUtils')
const { Logger } = require('../utils/loggerV2')

const program = new Command().hook('preAction', async () => {
  const { logger } = new Logger('bb-sync')

  if (!isGitInstalled()) {
    logger.log({ level: 'warning', message: 'Git is not installed on machine' })
    console.log('Git not installed')
    process.exitCode = 1
    return
  }
  await ensureUserLogins()

  logger.log({ level: 'info', message: 'User logins done' })

  await checkAndSetGitConnectionPreference()
  await checkAndSetUserSpacePreference()
})

program.action(Sync)

program.parse(process.argv)
