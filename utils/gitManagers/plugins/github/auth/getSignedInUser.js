/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// TODO -- could retry 3 times.
const { githubGraphQl } = require('./githubAPI')
const { axios } = require('../../../../axiosInstances')
const { getGitHeader } = require('../../../../getHeaders')

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
async function getSignedInUser(TOKEN) {
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
    const { login, id } = (await axios.post(githubGraphQl, { query: QUERY }, { headers: getGitHeader(TOKEN) })).data
      .data.viewer

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
      return result
    }
    console.log('Something went terribly wrong -- ', e.message)
    process.exitCode = 1
  }
  return result
}

module.exports = getSignedInUser
