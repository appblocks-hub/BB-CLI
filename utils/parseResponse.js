/**
 * Copyright (c) Yahilo. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Takes string and returns object
 * @param {String} data URI encoded query string
 * @returns An object with key and values parsed from string
 */
function parseUriEncodedQueryString(data) {
  return data.split('&').reduce((acc, v) => {
    const [k, val] = v.split('=')
    acc[k] = val
    return acc
  }, {})
}

module.exports = parseUriEncodedQueryString
