#!/usr/bin/env node

/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { Command } = require('commander')
const { configstore } = require('../configstore')
const getGithubDeviceCode = require('../utils/getGithubDeviceCode')
const { getGithubSignedInUser } = require('../utils/getSignedInUser')
const handleGithubAuth = require('../utils/handleGithubAuth')

const program = new Command()

program.argument('<service>', 'Name of service to connect')
program.option('-f, --force', 'force connect will remove existing tokens and restart login')

const connect = async (args) => {
  program.parse(args)
  const { force } = program.opts()
  const [service] = program.args

  switch (service) {
    case 'github':
      if (force) {
        configstore.delete('githubUserId')
        configstore.delete('githubUserToken')
      }
      if (configstore.get('githubUserId')) {
        const userToken = configstore.get('githubUserToken')
        const {
          user: { userName },
        } = await getGithubSignedInUser(userToken)
        // TODO -- if userName is null - handle
        console.log(`Already logged in as ${userName} \ntry --force to delete user and add new user`)
      } else {
        const response = await getGithubDeviceCode()
        await handleGithubAuth(response.data)
      }
      break

    default:
      console.log('Sorry no such service is supported!')
      break
  }
}

// To avoid calling create twice on tests
if (process.env.NODE_ENV !== 'test') connect(process.argv)

module.exports = connect
