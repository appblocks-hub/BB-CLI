#!/usr/bin/env node

/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const chalk = require('chalk')
const { Command } = require('commander')
const { loginWithAppBlock } = require('../auth')
const { configstore } = require('../configstore')
const { getYahiloSignedInUser } = require('../utils/getSignedInUser')

const program = new Command()

program.option(' --no-localhost', 'copy and paste a code instead of starting a local server for authentication')

const login = async (args) => {
  program.parse(args)
  // const args = program.args;

  // Check if already logged in to shield
  const presentTOKEN = configstore.get('appBlockUserToken', '')

  if (presentTOKEN) {
    const user = await getYahiloSignedInUser(presentTOKEN)
    if (user.user === configstore.get('appBlockUserName', '')) {
      console.log(`Already signed in as ${user.user}`)
      return
    }
  }
  const { localhost } = program.opts()
  const { data } = await loginWithAppBlock(localhost)
  configstore.set('appBlockUserToken', data.access_token)
  const user = await getYahiloSignedInUser(data.access_token)
  configstore.set('appBlockUserName', user.user)

  console.log(chalk.green(`Successfully logged in as ${user.user}`))
  // console.log(user)
}

// To avoid calling create twice on tests
if (process.env.NODE_ENV !== 'test') login(process.argv)

// module.exports = login
