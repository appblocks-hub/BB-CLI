/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Converts git@github.com:<username>/<repo-name>.git ->
 * https://github.com/<username>/<repo-name>.git
 * @param {String} url Git SSH url
 * @returns {String} Https git url
 */
function convertGitSshUrlToHttps(url) {
  return `https://github.com/${url.split(':')[1]}`
}

module.exports = convertGitSshUrlToHttps
