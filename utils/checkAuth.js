/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { configstore } = require('../configstore')
const { getShieldSignedInUser } = require('./getSignedInUser')

/**
 * @typedef returnObject
 * @property {Boolean} redoShieldAuth
 */

/**
 * Checks if Shield auth is valid or needs re auth
 * @returns {Promise<returnObject>}
 */
async function checkAuth() {
  const redo = { redoShieldAuth: true }
  const noredo = { redoShieldAuth: false }
  const token = configstore.get('appBlockUserToken', '')
  if (token) {
    try {
      const { user } = await getShieldSignedInUser(token)
      if (!user) {
        return redo
      }
      return noredo
    } catch (err) {
      console.log(`Something is wrong with shield\n${err}`)
      return redo
    }
  }
  return redo
}
module.exports = checkAuth
