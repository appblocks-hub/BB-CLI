/**
 * Copyright (c) Appblocks. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const open = require('open')
const chalk = require('chalk')
const { githubDeviceLogin, githubClientID, githubGetAccessToken } = require('./githubAPI')
const clipCopy = require('../../../../clipcopy')
const figletAsync = require('../../../../figletAsync')
const OTPVerify = require('../../../../OTPConfirmation')
const parseGitResponse = require('../../../../parseResponse')
const getDeviceCode = require('./getDeviceCode')
const getSignedInUser = require('./getSignedInUser')
const { configstore } = require('../../../../../configstore')

async function handleAuth({ force }) {
  try {
    if (force) {
      configstore.delete('githubUserId')
      configstore.delete('githubUserToken')
    }

    if (configstore.get('githubUserId')) {
      const userToken = configstore.get('githubUserToken')
      const {
        user: { userName },
      } = await getSignedInUser(userToken)
      // TODO -- if userName is null - handle
      console.log(chalk.yellow(`Already logged in as ${userName}`))
      console.log(chalk.dim(`try --force to reset user`))
      return
    }

    const response = await getDeviceCode()
    const OTPresponse = parseGitResponse(response.data)
    const userCode = OTPresponse.user_code
    const expiresIn = OTPresponse.expires_in
    console.log('\nPlease go to https://github.com/login/device, and paste the below code.')
    await figletAsync(userCode)
    console.log('\n')
    await clipCopy(userCode)
    console.log(`\nCode expires in ${chalk.bold(expiresIn)} seconds \n\n`)
    await open(githubDeviceLogin)
    const Cdata = {
      client_id: githubClientID,
      device_code: OTPresponse.device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }
    const done = await OTPVerify(Cdata, githubGetAccessToken)
    if (done) return
  } catch (error) {
    console.log(error.message)
    throw new Error('Something went wrong')
  }
}

module.exports = handleAuth
