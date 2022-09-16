/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const path = require('path')
const util = require('util')
const fs = require('fs')

module.exports = {
  getLoginUrl,
  queryParamString,
  getCallbackUrl,
  respondWithFile,
}

/**
 * @param {String} origin Url origin
 * @param {String} callbackUrl The localhost's url
 * @param {String} userHint No idea why this is here
 * @param {Number} _nonce State of app
 * @param {String} response_type Might need in future
 * @param {String} client_id ID stored in app
 * @returns {String} Login URL
 */
function getLoginUrl(origin, callbackUrl, userHint, _nonce, responseType, clientId) {
  return `${origin}?${new URLSearchParams([
    ['client_id', clientId],
    // scope: SCOPES.join(' '),
    ['response_type', responseType],
    ['state', _nonce],
    ['redirect_uri', callbackUrl],
    ['login_hint', userHint],
  ]).toString()}`
}

function queryParamString(args) {
  const tokens = []
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string') {
      tokens.push(`${key}=${encodeURIComponent(value)}`)
    }
  }
  return tokens.join('&')
}

function getCallbackUrl(port) {
  if (typeof port === 'undefined') {
    return 'urn:ietf:wg:oauth:2.0:oob'
  }
  return `http://localhost:${port}`
}

async function respondWithFile(req, res, statusCode, filename) {
  const response = await util.promisify(fs.readFile)(path.join(__dirname, filename))
  res.writeHead(statusCode, {
    'Content-Length': response.length,
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': 'https://shield.appblock.io',
  })
  res.end(response)
  req.socket.destroy()
}
