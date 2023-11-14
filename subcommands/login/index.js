#!/usr/bin/env node

/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { loginWithAppBlock } = require('../../auth')
const { configstore } = require('../../configstore')
const { feedback } = require('../../utils/cli-feedback')
const { getShieldSignedInUser } = require('../../utils/getSignedInUser')

const login = async (options) => {
  // Check if already logged in to shield
  const presentTOKEN = configstore.get('appBlockUserToken', '')

  if (presentTOKEN) {
    const { user } = await getShieldSignedInUser(presentTOKEN)
    if (user && user === configstore.get('appBlockUserName', '')) {
      console.log(`Already signed in as ${user}`)
      return
    }
  }
  const { localhost } = options
  const { data } = await loginWithAppBlock(localhost)
  configstore.set('appBlockUserToken', data.access_token)
  const { user } = await getShieldSignedInUser(data.access_token)
  configstore.set('appBlockUserName', user)

  feedback({ type: 'success', message: `Successfully logged in as ${user}` })
}

module.exports = login
