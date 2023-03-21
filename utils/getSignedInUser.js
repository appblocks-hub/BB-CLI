/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// TODO -- could retry 3 times.
const axios = require('axios')
const { appBlockVerifyToken, githubGraphQl, clientId } = require('./api')
const { gitGraphHTTP } = require('./axiosInstances')

/**
 * @typedef getSignedInGitUserReturnPart
 * @type {object}
 * @property {(String|Null)} userName
 * @property {(String|Null)} userId
 */

/**
 * @typedef getSignedInGitUserReturn
 * @type {object}
 * @property {getSignedInGitUserReturnPart} user The name and id of user if call is success, both null otherwise
 * @property {(string|null)} error A human readable error message
 */

/**
 * Get the username and id of current signed in user from Github
 * @returns {Promise<getSignedInGitUserReturn>}
 */
async function getGithubSignedInUser() {
  const QUERY = `query { 
        viewer { 
          login
          id
        }
      }`

  const result = {
    user: null,
    error: null,
  }

  try {
    const { id, login } = (await gitGraphHTTP.post(githubGraphQl, { QUERY })).data.data
    result.user = {
      userId: id,
      userName: login,
    }
    result.error = null
  } catch (e) {
    // If not properly working, redo auth again.
    // console.log(e.response.status, e.response.statusText, e.response.data)
    // if status is 401 return with message {user,error}
    // else retry with 1sec delay
    if (e.response?.status === 401) {
      result.user = null
      result.error = e.response.statusText
    }
    console.log('Something went terribly wrong -- ', e.message)
    process.exitCode = 1
  }
  return result
}

/**
 * @typedef {object} t1_user
 * @property {string?} user
 * @property {string} token
 */
/**
 * Checks for the validity of the provided token, returns token and username
 * @param {string} TOKEN oAuth token string
 * @returns {Promise<t1_user>}
 */
async function getShieldSignedInUser(TOKEN) {
  const user = { token: TOKEN }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
    'Client-Id': clientId,
  }
  try {
    // Check if TOKEN still valid
    const response = await axios.post(appBlockVerifyToken, {}, { headers })
    user.user = response.data.email
  } catch (e) {
    user.user = 'default-user'
    // If not properly working, redo auth again.
    // console.log(e.response.status, e.response.statusText, e.response.data)
    // if status is 401 return with message {user,error}
    // else retry with 1sec delay
    if (e.response.status >= 400) {
      user.user = null
    }
    // retry here
    // TODO
  }

  return user
}
module.exports = { getGithubSignedInUser, getShieldSignedInUser }
