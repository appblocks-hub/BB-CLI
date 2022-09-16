#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { configstore } = require('../configstore')
const getGithubDeviceCode = require('../utils/getGithubDeviceCode')
const { getGithubSignedInUser } = require('../utils/getSignedInUser')
const handleGithubAuth = require('../utils/handleGithubAuth')

const connect = async (service, options) => {
  const { force } = options

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

module.exports = connect
