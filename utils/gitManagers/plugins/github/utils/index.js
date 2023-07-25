/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 *
 * @param {String} prefersSsh
 * @param {String} sshUrl
 * @param {String} token
 * @returns
 */
const getGithubRemote = (prefersSsh, sshUrl, token) =>
  prefersSsh ? sshUrl : sshUrl.replace('git@github.com:', `https://${token}:x-oauth-basic@github.com/`)

/**
 *
 * @param {String} url
 * @param {String} type
 * @returns
 */
const convertGithubUrl = (url, type) => {
  const httpsPrefix = 'https://github.com/'
  const sshPrefix = 'git@github.com:'

  if (type === 'ssh') {
    if (url.includes('git@')) return url
    return url.trim().replace(httpsPrefix, sshPrefix)
  }

  if (url.includes('https')) return url
  return url.trim().replace(sshPrefix, httpsPrefix)
}

module.exports = { getGithubRemote, convertGithubUrl }
