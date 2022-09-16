/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// TODO -- could retry 3 times.
const axios = require('axios')
const { appBlockOrigin, githubGraphQl } = require('./api')

/**
 * @typedef userObject
 * @type {object}
 * @property {(String|Null)} userName
 * @property {(String|Null)} userId
 */

/**
 * @typedef ReturnType
 * @type {object}
 * @property {userObject} user The name and id of user if call is success, both null otherwise
 * @property {(string|null)} error A human readable error message
 */

/**
 * Make call with the given token and retrieve the name of user
 * @param {string} TOKEN Token from env
 * @returns {ReturnType}
 */
// eslint-disable-next-line consistent-return
async function getGithubSignedInUser(TOKEN) {
  const query = `query { 
        viewer { 
          login
          id
        }
      }`
  // const url = 'https://api.github.com/graphql'
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `bearer ${TOKEN}`,
    Accept: 'application/vnd.github.v4+json',
  }
  try {
    // Check if TOKEN still working
    const response = await axios.post(githubGraphQl, { query }, { headers })
    return {
      user: {
        userId: response.data.data.viewer.id,
        userName: response.data.data.viewer.login,
      },
      error: null,
    }
  } catch (e) {
    // If not properly working, redo auth again.
    // console.log(e.response.status, e.response.statusText, e.response.data)
    // if status is 401 return with message {user,error}
    // else retry with 1sec delay
    if (e.response?.status === 401) {
      return { user: null, error: e.response.statusText }
    }
    console.log('Something went terribly wrong -- ', e.message)
    // retry here
    // TODO
    process.exit(0)
  }
}

async function getShieldSignedInUser(TOKEN) {
  const user = { token: TOKEN }
  const url = `${appBlockOrigin}/device/get-email`
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
    // Accept: 'application/vnd.github.v4+json',
  }
  try {
    // Check if TOKEN still working
    const response = await axios.get(url, { headers })
    user.user = response.data.email
  } catch (e) {
    user.user = 'default-user'
    // If not properly working, redo auth again.
    // console.log(e.response.status, e.response.statusText, e.response.data)
    // if status is 401 return with message {user,error}
    // else retry with 1sec delay
    if (e.response.status === 401) {
      user.user = null
    }
    // retry here
    // TODO
  }

  return user
}
module.exports = { getGithubSignedInUser, getShieldSignedInUser }
