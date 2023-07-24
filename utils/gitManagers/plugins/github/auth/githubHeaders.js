/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { configstore } = require('../../../../../configstore')

const getGitHeader = (TOKEN) => ({
  'Content-Type': 'application/json',
  Authorization: `bearer ${TOKEN || configstore.get('githubUserToken')}`,
  Accept: 'application/vnd.github.v4+json',
})

const getGitRestHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${configstore.get('githubUserToken')}`,
  Accept: 'application/vnd.github.v3+json',
})

module.exports = { getGitHeader, getGitRestHeaders }
