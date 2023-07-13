/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Converts git@github.com:<username>/<repo-name>.git
 * <-> https://github.com/<username>/<repo-name>.git
 * @param {String} url Git url
 * @param {String} type  (ssh, https) default https
 * @returns {String} https git url by default, if ssh is passed then shh git url
 */
function convertGitUrl(url, type) {
  
  const httpsPrefix = 'https://github.com/'
  const sshPrefix = 'git@github.com:'

  if (type === 'ssh') {
    if (url.includes('git@')) return url
    return url.trim().replace(httpsPrefix, sshPrefix)
  }

  if (url.includes('https')) return url
  return url.trim().replace(sshPrefix, httpsPrefix)
}

module.exports = convertGitUrl
