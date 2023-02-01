/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
const open = require('open')
const http = require('http')
const axios = require('axios')
const nodeurl = require('url')
const portfinder = require('portfinder')
const chalk = require('chalk')

portfinder.basePort = 8002

const { respondWithFile, getCallbackUrl, getLoginUrl } = require('./utils/authUtils')
const { appBlockLogin, appBlockAccessToken, clientId } = require('./utils/api')
const { getDeviceCode } = require('./utils/questionPrompts')

module.exports = {
  loginWithLocalhost,
  loginWithoutLocalhost,
  loginWithAppBlock,
}

// const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;
// const SCOPES = [
//   scopes.EMAIL,
//   scopes.OPENID,
//   scopes.CLOUD_PROJECTS_READONLY,
//   scopes.FIREBASE_PLATFORM,
//   scopes.CLOUD_PLATFORM,
// ];
// eslint-disable-next-line no-bitwise,no-underscore-dangle
const _nonce = Math.floor(Math.random() * (2 << 29) + 1).toString()
const getPort = portfinder.getPortPromise

let lastAccessToken

async function getTokensFromAuthorizationCode(code) {
  let res
  try {
    res = await axios.get(
      `${appBlockAccessToken}?device_code=${code}&grant_type=urn:ietf:params:oauth:grant-type:device_code`,
      {
        // eslint-disable-next-line object-shorthand
        // device_code: code,
        // client_id: api.clientId,
        // client_id: 'arjun',
        // client_secret: api.clientSecret,
        // redirect_uri: callbackUrl,
        // grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }
    )
  } catch (err) {
    if (err instanceof Error) {
      // logger.debug("Token Fetch Error:", err.stack || "");
      console.log('Token Fetch Error:', err.stack || '')
    } else {
      // logger.debug("Token Fetch Error");
      console.log('Token Fetch Error')
    }
    // throw invalidCredentialError();
    throw Error('invalid credential')
  }
  // if (!res?.body?.access_token && !res?.body?.refresh_token) {
  //   // logger.debug("Token Fetch Error:", res.statusCode, res.body);
  //   console.log('Token Fetch Error:', res.statusCode, res.body)
  //   // throw invalidCredentialError();
  //   throw Error('invalid credential')
  // }
  // lastAccessToken = {
  //   expires_at: Date.now() + res?.body?.expires_in * 1000,
  //   ...res.body,
  // }
  lastAccessToken = {
    // expires_at: Date.now() + res?.data?.expires_in * 1000,
    ...res.data,
  }
  return lastAccessToken
}
async function loginWithoutLocalhost() {
  const callbackUrl = getCallbackUrl()
  const authUrl = getLoginUrl(appBlockLogin, callbackUrl, 'userhint', _nonce, 'device_code', clientId)

  // logger.info();
  // logger.info("Visit this URL on any device to log in:");
  // logger.info(clc.bold.underline(authUrl));
  // logger.info();
  console.log()
  console.log('Visit this URL on any device to log in:')
  console.log(chalk.bold.underline(authUrl))
  console.log()

  open(authUrl)

  // const code = await prompt({
  //   type: "input",
  //   name: "code",
  //   message: "Paste authorization code here:",
  // });

  const code = await getDeviceCode()
  const tokens = await getTokensFromAuthorizationCode(code, callbackUrl)
  // getTokensFromAuthorizationCode doesn't handle the --token case, so we know
  // that we'll have a valid id_token.
  // return {
  //   user: jwt.decode(tokens.id_token!) as User,
  //   tokens: tokens,
  //   scopes: SCOPES,
  // };

  return tokens
}

function loginWithLocalhost(port, authUrl) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const headers = {
        'Access-Control-Allow-Origin': 'https://shield.appblock.io',
        'Access-Control-Allow-Headers':
          'Access-Control-Allow-Origin, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers',
        'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS,POST,PUT',
        'Access-Control-Max-Age': 2592000, // 30 days
        /** add other headers as per requirement */
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(204, headers)
        res.end()
        return
      }
      const query = nodeurl.parse(`${req.url}`, true).query || {}
      const queryState = query.state
      const queryCode = query.device_code
      if (queryState !== _nonce || typeof queryCode !== 'string') {
        await respondWithFile(req, res, 400, '../templates/loginFailure.html')
        reject(new Error('Unexpected error while logging in'))
        server.close()
        return
      }
      try {
        const tokens = await getTokensFromAuthorizationCode(queryCode)
        await respondWithFile(req, res, 200, '../templates/loginSuccess.html')
        resolve(tokens)
      } catch (err) {
        await respondWithFile(req, res, 400, '../templates/loginFailure.html')
        reject(err)
      }

      server.close()
      // return
    })

    server.listen(port, () => {
      // logger.info();
      // logger.info("Visit this URL on this device to log in:");
      // logger.info(clc.bold.underline(authUrl));
      // logger.info();
      // logger.info("Waiting for authentication...");
      console.log()
      console.log('Visit this URL on this device to log in:')
      console.log(chalk.bold.underline(authUrl))
      console.log()
      console.log('Waiting for authentication...')
      console.log()
      open(authUrl)
    })
    server.on('error', (err) => {
      console.log('error server')
      reject(err)
    })
  })
}

/**
 *
 * @param {Boolean} localhost Use localhost or not
 * @param {String} userHint NOT used now.OPTIONAL
 * @returns
 */
async function loginWithAppBlock(localhost, userHint) {
  if (localhost) {
    try {
      const port = await getPort()
      return await loginWithLocalhostAppBlock(port, userHint || null)
    } catch {
      return loginWithoutLocalhost(userHint || null)
    }
  }
  return loginWithoutLocalhost(userHint || null)
}

/**
 *
 * @param {Number} port Port address
 * @returns
 */
async function loginWithLocalhostAppBlock(port) {
  const callbackUrl = getCallbackUrl(port)
  const authUrl = getLoginUrl(appBlockLogin, callbackUrl, 'userhint', _nonce, 'device_code', clientId)
  // console.log(port, authUrl, callbackUrl)
  // const successTemplate = "../templates/loginSuccess.html";
  const tokens = await loginWithLocalhost(
    port,
    authUrl,
    callbackUrl
    // successTemplate,
    // getTokensFromAuthorizationCode
  )
  // getTokensFromAuthoirzationCode doesn't handle the --token case, so we know we'll
  // always have an id_token.
  // return {
  //   user: jwt.decode(tokens.id_token!) as User,
  //   tokens: tokens,
  //   scopes: tokens.scopes!,
  // };
  return tokens
}
