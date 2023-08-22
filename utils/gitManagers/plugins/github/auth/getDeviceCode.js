/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const axios = require('axios')
const { githubGetDeviceCode, githubClientID } = require('./githubAPI')

function getDeviceCode() {
  return axios.post(githubGetDeviceCode, {
    client_id: githubClientID,
    scope: 'repo,read:org,delete_repo',
  })
}

module.exports = getDeviceCode
