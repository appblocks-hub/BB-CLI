/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-unused-expressions */
const axios = require('axios')
const { checkAndSetAuth } = require('./checkAndSetAuth')
const { githubGetDeviceCode, githubClientID } = require('./api')
const handleGithubAuth = require('./handleGithubAuth')
const checkAuth = require('./checkAuth')
const { loginWithAppBlock } = require('../auth')
const { getShieldSignedInUser } = require('./getSignedInUser')
const { configstore } = require('../configstore')
const { spinnies } = require('../loader')

async function ensureUserLogins(noRepo) {
  spinnies.add('logins', { text: 'Checking Git auths' })
  try {
    if (!noRepo) {
      const { redoAuth } = await checkAndSetAuth()
      if (redoAuth) {
        spinnies.update('logins', {
          text: 'Git not logged in',
          status: 'stopped',
          color: 'yellow',
        })

        const response = await axios.post(githubGetDeviceCode, {
          client_id: githubClientID,
          scope: 'repo,read:org,delete_repo',
        })
        await handleGithubAuth(decodeURIComponent(response.data))
      }
    }
    if (!spinnies.hasActiveSpinners()) {
      spinnies.add('logins', { text: 'Git auth done' })
    }
    spinnies.update('logins', { text: 'Checking shield auths' })

    const { redoShieldAuth } = await checkAuth()
    if (redoShieldAuth) {
      spinnies.update('logins', {
        text: 'Shield not logged in',
        status: 'stopped',
        color: 'yellow',
      })
      configstore.delete('currentSpaceName', '')
      const { data } = await loginWithAppBlock(true)
      configstore.set('appBlockUserToken', data.access_token)
      const user = await getShieldSignedInUser(data.access_token)
      configstore.set('appBlockUserName', user.user)
    }

    if (!spinnies.hasActiveSpinners()) {
      spinnies.add('logins', { text: 'Shield auth done' })
    }

    spinnies.succeed('logins', { text: 'Logins Done' })
    spinnies.remove('logins')
  } catch (error) {
    spinnies.fail('logins', { text: error.message || 'Something went wrong!' })
    spinnies.stopAll()
  }
}
module.exports = { ensureUserLogins }
