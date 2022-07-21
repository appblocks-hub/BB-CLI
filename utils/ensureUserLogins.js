/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable no-unused-expressions */
const axios = require('axios')
const Spinnies = require('spinnies')
const { checkAndSetAuth } = require('./checkAndSetAuth')
const { githubGetDeviceCode, githubClientID } = require('./api')
const handleGithubAuth = require('./handleGithubAuth')
const checkAuth = require('./checkAuth')
const { loginWithAppBlock } = require('../auth')
const { getYahiloSignedInUser } = require('./getSignedInUser')
const { configstore } = require('../configstore')

async function ensureUserLogins() {
  // await login()
  const spinnies = new Spinnies()
  spinnies.add('logins', { text: 'Checking Git auths' })
  const { redoAuth } = await checkAndSetAuth()
  if (redoAuth) {
    spinnies.update('logins', {
      text: 'Git not logged in',
      status: 'stopped',
      color: 'yellow',
    })

    const response = await axios.post(githubGetDeviceCode, {
      client_id: githubClientID,
      scope: 'repo,read:org',
    })
    await handleGithubAuth(decodeURIComponent(response.data))
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
    const { data } = await loginWithAppBlock(true)
    configstore.set('appBlockUserToken', data.access_token)
    const user = await getYahiloSignedInUser(data.access_token)
    configstore.set('appBlockUserName', user.user)
  }

  if (!spinnies.hasActiveSpinners()) {
    spinnies.add('logins', { text: 'Shield auth done' })
  }

  spinnies.succeed('logins', { text: 'Logins Done' })
  spinnies.remove('logins')
}
module.exports = { ensureUserLogins }
